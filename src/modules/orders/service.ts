import { desc, eq, inArray } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { menus, orderItems, orders, tables, tenants } from "../../db/schema";
import type {
  CreateOrderDTOType,
  UpdateOrderItemStatusDTOType,
  UpdateOrderStatusDTOType,
} from "./model";

export class OrderService {
  async create(data: CreateOrderDTOType, currentUser: AuthUser | null) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Order must contain at least one item");
    }

    // Verify table if provided
    if (data.tableId) {
      const table = await db.query.tables.findFirst({
        where: eq(tables.id, data.tableId),
      });
      if (!table) {
        throw new NotFoundError(`Table '${data.tableId}' not found`);
      }
    }

    // Fetch all requested menus
    const menuIds = data.items.map((i) => i.menuId);
    const fetchedMenus = await db.query.menus.findMany({
      where: inArray(menus.id, menuIds),
      with: {
        tenant: true,
      },
    });

    const menuMap = new Map(fetchedMenus.map((m) => [m.id, m]));

    // Validate availability of menus & open status of tenants
    for (const item of data.items) {
      const menuItem = menuMap.get(item.menuId);
      if (!menuItem) {
        throw new NotFoundError(`Menu item with id '${item.menuId}' not found`);
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestError(
          `Menu item '${menuItem.name}' is currently unavailable`,
        );
      }
      if (!menuItem.tenant.isOpen) {
        throw new BadRequestError(
          `Tenant '${menuItem.tenant.name}' is currently closed`,
        );
      }
    }

    // Calculate totals and prepare order items
    let totalPrice = 0;
    const orderId = crypto.randomUUID();
    const orderNumber = `FC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const preparedItems = data.items.map((item) => {
      const menuItem = menuMap.get(item.menuId)!;
      const unitPrice = menuItem.price;
      const subtotal = unitPrice * item.quantity;
      totalPrice += subtotal;

      return {
        id: crypto.randomUUID(),
        orderId,
        menuId: menuItem.id,
        tenantId: menuItem.tenantId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        itemStatus: "pending" as const,
        specialNotes: item.specialNotes ?? null,
      };
    });

    const newOrder = {
      id: orderId,
      orderNumber,
      customerId: currentUser?.id ?? null,
      customerName:
        data.customerName ?? (currentUser ? currentUser.email : "Guest"),
      tableId: data.tableId ?? null,
      status: "pending" as const,
      totalPrice,
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert order and order items
    await db.insert(orders).values(newOrder);
    await db.insert(orderItems).values(preparedItems);

    // If table assigned, mark table as occupied
    if (data.tableId) {
      await db
        .update(tables)
        .set({ status: "occupied" })
        .where(eq(tables.id, data.tableId));
    }

    return this.getById(orderId);
  }

  async getById(id: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        table: true,
        customer: true,
        items: {
          with: {
            menu: true,
            tenant: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with id '${id}' not found`);
    }

    return order;
  }

  async getAll(
    currentUser: AuthUser | null,
    filter: { status?: string; tableId?: string },
  ) {
    // If admin, can see all
    if (currentUser?.role === "admin") {
      return db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        with: {
          table: true,
          items: {
            with: {
              menu: true,
              tenant: true,
            },
          },
          payment: true,
        },
      });
    }

    // If customer, show only their orders
    if (currentUser && currentUser.role === "customer") {
      return db.query.orders.findMany({
        where: eq(orders.customerId, currentUser.id),
        orderBy: [desc(orders.createdAt)],
        with: {
          table: true,
          items: {
            with: {
              menu: true,
              tenant: true,
            },
          },
          payment: true,
        },
      });
    }

    // If tenant, get orders for stalls they own
    if (currentUser && currentUser.role === "tenant") {
      const ownedTenants = await db.query.tenants.findMany({
        where: eq(tenants.ownerId, currentUser.id),
      });
      const tenantIds = ownedTenants.map((t) => t.id);

      if (tenantIds.length === 0) return [];

      return db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        with: {
          table: true,
          items: {
            where: inArray(orderItems.tenantId, tenantIds),
            with: {
              menu: true,
              tenant: true,
            },
          },
          payment: true,
        },
      });
    }

    // Public / guest by table
    if (filter.tableId) {
      return db.query.orders.findMany({
        where: eq(orders.tableId, filter.tableId),
        orderBy: [desc(orders.createdAt)],
        with: {
          table: true,
          items: {
            with: {
              menu: true,
              tenant: true,
            },
          },
          payment: true,
        },
      });
    }

    return db.query.orders.findMany({
      limit: 20,
      orderBy: [desc(orders.createdAt)],
      with: {
        table: true,
        items: true,
        payment: true,
      },
    });
  }

  async updateStatus(
    id: string,
    data: UpdateOrderStatusDTOType,
    user: AuthUser,
  ) {
    const existing = await this.getById(id);

    if (user.role !== "admin") {
      throw new ForbiddenError("Only admins can update overall order status");
    }

    await db
      .update(orders)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(orders.id, id));

    // If order is completed or cancelled, free the table
    if (
      (data.status === "completed" || data.status === "cancelled") &&
      existing.tableId
    ) {
      await db
        .update(tables)
        .set({ status: "available" })
        .where(eq(tables.id, existing.tableId));
    }

    return this.getById(id);
  }

  async updateItemStatus(
    itemId: string,
    data: UpdateOrderItemStatusDTOType,
    user: AuthUser,
  ) {
    const item = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
      with: {
        tenant: true,
      },
    });

    if (!item) {
      throw new NotFoundError(`Order item '${itemId}' not found`);
    }

    if (user.role !== "admin" && item.tenant.ownerId !== user.id) {
      throw new ForbiddenError(
        "You can only update the status of your own stall's items",
      );
    }

    await db
      .update(orderItems)
      .set({ itemStatus: data.itemStatus })
      .where(eq(orderItems.id, itemId));

    return this.getById(item.orderId);
  }
}

export const orderService = new OrderService();
