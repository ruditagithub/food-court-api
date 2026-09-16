import { desc, eq, inArray } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import {
  diningSessions,
  foodCourts,
  kitchenQueues,
  menuOptions,
  menus,
  orderItemOptions,
  orderItems,
  orders,
  orderStatusLogs,
  paymentGroupItems,
  paymentGroups,
  sessionParticipants,
  tables,
  tenantOrders,
  tenants,
} from "../../db/schema";
import type {
  CreateOrderDTOType,
  JoinSessionDTOType,
  UpdateOrderItemStatusDTOType,
  UpdateOrderStatusDTOType,
  UpdateTenantOrderStatusDTOType,
} from "./model";

export class OrderService {
  private async getOrCreateDefaultFoodCourt(): Promise<string> {
    const defaultCourt = await db.query.foodCourts.findFirst();
    if (defaultCourt) return defaultCourt.id;

    const id = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id,
      name: "Food Court Utama",
      slug: "food-court-utama",
      status: "ACTIVE",
    });
    return id;
  }

  async create(data: CreateOrderDTOType, currentUser: AuthUser | null) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Order must contain at least one item");
    }

    let sessionId = data.sessionId;
    let tableRecord: typeof tables.$inferSelect | undefined;

    // Resolve or create dining session
    if (sessionId) {
      const existingSession = await db.query.diningSessions.findFirst({
        where: eq(diningSessions.id, sessionId),
      });
      if (!existingSession) {
        throw new NotFoundError(`Dining session '${sessionId}' not found`);
      }
      if (existingSession.status !== "ACTIVE") {
        throw new BadRequestError(
          `Dining session '${sessionId}' is no longer active (status: ${existingSession.status})`,
        );
      }
    } else if (data.tableId) {
      tableRecord = await db.query.tables.findFirst({
        where: eq(tables.id, data.tableId),
      });
      if (!tableRecord) {
        throw new NotFoundError(`Table '${data.tableId}' not found`);
      }

      // Check for an existing active session on this table
      const activeSession = await db.query.diningSessions.findFirst({
        where: eq(diningSessions.tableId, data.tableId),
      });

      if (activeSession && activeSession.status === "ACTIVE") {
        sessionId = activeSession.id;
      } else {
        // Create new active dining session
        sessionId = crypto.randomUUID();
        const sessionCode = `S-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

        await db.insert(diningSessions).values({
          id: sessionId,
          foodCourtId: tableRecord.foodCourtId,
          tableId: tableRecord.id,
          sessionCode,
          orderType: data.orderType ?? "DINE_IN",
          status: "ACTIVE",
          startedAt: new Date(),
        });

        // Mark table as occupied
        await db
          .update(tables)
          .set({ status: "occupied", updatedAt: new Date() })
          .where(eq(tables.id, tableRecord.id));

        // Create host participant
        await db.insert(sessionParticipants).values({
          id: crypto.randomUUID(),
          sessionId,
          userId: currentUser?.id ?? null,
          name: data.customerName ?? (currentUser ? currentUser.name : "Host"),
          isHost: true,
          joinedAt: new Date(),
        });
      }
    } else {
      // Direct takeaway without table
      const defaultCourtId = await this.getOrCreateDefaultFoodCourt();
      sessionId = crypto.randomUUID();
      const sessionCode = `TA-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

      await db.insert(diningSessions).values({
        id: sessionId,
        foodCourtId: defaultCourtId,
        sessionCode,
        orderType: "TAKEAWAY",
        status: "ACTIVE",
        startedAt: new Date(),
      });

      await db.insert(sessionParticipants).values({
        id: crypto.randomUUID(),
        sessionId,
        userId: currentUser?.id ?? null,
        name: data.customerName ?? (currentUser ? currentUser.name : "Guest"),
        isHost: true,
        joinedAt: new Date(),
      });
    }

    // Fetch participant for bill allocation
    let participant = await db.query.sessionParticipants.findFirst({
      where: eq(sessionParticipants.sessionId, sessionId!),
    });

    if (!participant) {
      const participantId = crypto.randomUUID();
      await db.insert(sessionParticipants).values({
        id: participantId,
        sessionId: sessionId!,
        userId: currentUser?.id ?? null,
        name: data.customerName ?? "Guest",
        isHost: true,
        joinedAt: new Date(),
      });
      participant = { id: participantId } as typeof sessionParticipants.$inferSelect;
    }

    // Fetch and validate menus
    const menuIds = data.items.map((i) => i.menuId);
    const fetchedMenus = await db.query.menus.findMany({
      where: inArray(menus.id, menuIds),
      with: {
        tenant: true,
        options: true,
      },
    });

    const menuMap = new Map(fetchedMenus.map((m) => [m.id, m]));

    // Validate availability & tenant status
    for (const item of data.items) {
      const menuItem = menuMap.get(item.menuId);
      if (!menuItem) {
        throw new NotFoundError(`Menu item with id '${item.menuId}' not found`);
      }
      if (!menuItem.isAvailable || menuItem.status === "OUT_OF_STOCK" || menuItem.status === "HIDDEN") {
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

    // Collect all requested option IDs if any
    const allOptionIds = data.items.flatMap((i) => i.optionIds ?? []);
    const optionMap = new Map<string, typeof menuOptions.$inferSelect>();
    if (allOptionIds.length > 0) {
      const fetchedOptions = await db.query.menuOptions.findMany({
        where: inArray(menuOptions.id, allOptionIds),
      });
      for (const opt of fetchedOptions) {
        optionMap.set(opt.id, opt);
      }
    }

    // Group items by tenant
    const itemsByTenant = new Map<string, typeof data.items>();
    for (const item of data.items) {
      const menuItem = menuMap.get(item.menuId)!;
      const existing = itemsByTenant.get(menuItem.tenantId) ?? [];
      existing.push(item);
      itemsByTenant.set(menuItem.tenantId, existing);
    }

    const orderId = crypto.randomUUID();
    const orderNumber = `FC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    let overallTotal = 0;
    const preparedTenantOrders: Array<{
      id: string;
      tenantId: string;
      subtotal: number;
      items: Array<{
        id: string;
        menuId: string;
        menuNameSnapshot: string;
        unitPriceSnapshot: number;
        quantity: number;
        subtotal: number;
        notes: string | null;
        options: Array<{
          id: string;
          name: string;
          priceAdjustment: number;
        }>;
      }>;
    }> = [];

    for (const [tenantId, tenantItems] of itemsByTenant.entries()) {
      const tenantOrderId = crypto.randomUUID();
      let tenantSubtotal = 0;
      const preparedItems = [];

      for (const item of tenantItems) {
        const menuItem = menuMap.get(item.menuId)!;
        let unitPrice = menuItem.price;
        const itemOptions = [];

        if (item.optionIds && item.optionIds.length > 0) {
          for (const optId of item.optionIds) {
            const opt = optionMap.get(optId);
            if (opt && opt.menuId === menuItem.id) {
              unitPrice += opt.priceAdjustment;
              itemOptions.push({
                id: crypto.randomUUID(),
                name: opt.name,
                priceAdjustment: opt.priceAdjustment,
              });
            }
          }
        }

        const itemSubtotal = unitPrice * item.quantity;
        tenantSubtotal += itemSubtotal;

        preparedItems.push({
          id: crypto.randomUUID(),
          menuId: menuItem.id,
          menuNameSnapshot: menuItem.name,
          unitPriceSnapshot: menuItem.price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes ?? item.specialNotes ?? null,
          options: itemOptions,
        });
      }

      overallTotal += tenantSubtotal;
      preparedTenantOrders.push({
        id: tenantOrderId,
        tenantId,
        subtotal: tenantSubtotal,
        items: preparedItems,
      });
    }

    // 1. Insert Master Order
    await db.insert(orders).values({
      id: orderId,
      sessionId: sessionId!,
      orderNumber,
      subtotal: overallTotal,
      taxAmount: 0,
      serviceFee: 0,
      discountAmount: 0,
      totalAmount: overallTotal,
      paymentStatus: "PENDING",
      orderStatus: "DRAFT",
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Insert Tenant Orders, Items, Options, and Kitchen Queues
    const allInsertedOrderItems: Array<{ id: string; subtotal: number }> = [];

    for (const tOrder of preparedTenantOrders) {
      await db.insert(tenantOrders).values({
        id: tOrder.id,
        orderId,
        tenantId: tOrder.tenantId,
        subtotal: tOrder.subtotal,
        status: "WAITING_PAYMENT",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const item of tOrder.items) {
        await db.insert(orderItems).values({
          id: item.id,
          tenantOrderId: tOrder.id,
          menuId: item.menuId,
          menuNameSnapshot: item.menuNameSnapshot,
          unitPriceSnapshot: item.unitPriceSnapshot,
          quantity: item.quantity,
          subtotal: item.subtotal,
          notes: item.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        allInsertedOrderItems.push({ id: item.id, subtotal: item.subtotal });

        for (const opt of item.options) {
          await db.insert(orderItemOptions).values({
            id: opt.id,
            orderItemId: item.id,
            optionNameSnapshot: opt.name,
            priceAdjustmentSnapshot: opt.priceAdjustment,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Initial kitchen queue entry
      const queueNumber = `Q-${Math.floor(100 + Math.random() * 900)}`;
      await db.insert(kitchenQueues).values({
        id: crypto.randomUUID(),
        tenantOrderId: tOrder.id,
        queueNumber,
        status: "QUEUED",
        queuedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 3. Create Default Payment Group & Allocate Items
    const paymentGroupId = crypto.randomUUID();
    await db.insert(paymentGroups).values({
      id: paymentGroupId,
      orderId,
      participantId: participant.id,
      amountDue: overallTotal,
      amountPaid: 0,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const item of allInsertedOrderItems) {
      await db.insert(paymentGroupItems).values({
        id: crypto.randomUUID(),
        paymentGroupId,
        orderItemId: item.id,
        allocatedAmount: item.subtotal,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 4. Log initial order creation
    await db.insert(orderStatusLogs).values({
      id: crypto.randomUUID(),
      orderId,
      status: "DRAFT",
      description: `Order created by ${data.customerName ?? (currentUser ? currentUser.name : "Guest")}`,
      createdAt: new Date(),
    });

    return this.getById(orderId);
  }

  async getById(id: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        session: {
          with: {
            table: true,
            foodCourt: true,
            participants: true,
          },
        },
        tenantOrders: {
          with: {
            tenant: true,
            kitchenQueue: true,
            items: {
              with: {
                menu: true,
                options: true,
              },
            },
          },
        },
        paymentGroups: {
          with: {
            payments: true,
            participant: true,
          },
        },
        statusLogs: {
          orderBy: [desc(orderStatusLogs.createdAt)],
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with id '${id}' not found`);
    }

    // Build flattened items and compatibility fields
    const allItems = order.tenantOrders.flatMap((to) =>
      to.items.map((item) => ({
        ...item,
        tenantId: to.tenantId,
        tenant: to.tenant,
        unitPrice: item.unitPriceSnapshot,
        itemStatus: to.status.toLowerCase(),
        specialNotes: item.notes,
      })),
    );

    const firstPayment = order.paymentGroups.flatMap((pg) => pg.payments)[0];

    return {
      ...order,
      status: order.orderStatus.toLowerCase(),
      totalPrice: order.totalAmount,
      tableId: order.session?.tableId ?? null,
      table: order.session?.table ?? null,
      items: allItems,
      payment: firstPayment ?? null,
    };
  }

  async trackByOrderNumber(orderNumber: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
      with: {
        session: {
          with: {
            table: true,
            foodCourt: true,
          },
        },
        tenantOrders: {
          with: {
            tenant: true,
            kitchenQueue: true,
            items: {
              with: {
                options: true,
              },
            },
          },
        },
        paymentGroups: {
          with: {
            payments: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with number '${orderNumber}' not found`);
    }

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      tableNumber: order.session?.table?.tableNumber ?? "Takeaway",
      sessionCode: order.session?.sessionCode,
      createdAt: order.createdAt,
      stalls: order.tenantOrders.map((to) => ({
        tenantName: to.tenant.name,
        stallNumber: to.tenant.stallNumber,
        status: to.status,
        queueNumber: to.kitchenQueue?.queueNumber ?? "-",
        items: to.items.map((item) => ({
          name: item.menuNameSnapshot,
          quantity: item.quantity,
          options: item.options.map((o) => o.optionNameSnapshot),
        })),
      })),
    };
  }

  async joinSession(data: JoinSessionDTOType, currentUser: AuthUser | null) {
    let session = null;

    if (data.sessionCode) {
      session = await db.query.diningSessions.findFirst({
        where: eq(diningSessions.sessionCode, data.sessionCode),
        with: { table: true, foodCourt: true },
      });
    } else if (data.qrToken) {
      const table = await db.query.tables.findFirst({
        where: eq(tables.qrToken, data.qrToken),
      });
      if (!table) {
        throw new NotFoundError(`Table with QR token '${data.qrToken}' not found`);
      }
      session = await db.query.diningSessions.findFirst({
        where: eq(diningSessions.tableId, table.id),
        with: { table: true, foodCourt: true },
      });
    } else {
      throw new BadRequestError("Provide either sessionCode or qrToken");
    }

    if (!session) {
      throw new NotFoundError("Active dining session not found");
    }

    if (session.status !== "ACTIVE") {
      throw new BadRequestError(`Dining session is ${session.status}`);
    }

    const participantId = crypto.randomUUID();
    await db.insert(sessionParticipants).values({
      id: participantId,
      sessionId: session.id,
      userId: currentUser?.id ?? null,
      name: data.name,
      deviceToken: data.deviceToken ?? null,
      isHost: false,
      joinedAt: new Date(),
    });

    return {
      participantId,
      sessionId: session.id,
      sessionCode: session.sessionCode,
      tableNumber: session.table?.tableNumber,
      foodCourtName: session.foodCourt.name,
    };
  }

  async updateStatus(
    id: string,
    data: UpdateOrderStatusDTOType,
    user: AuthUser,
  ) {
    const existing = await this.getById(id);

    // Normalize status string
    const targetStatus = data.status.toUpperCase();
    const allowedStatuses = [
      "DRAFT",
      "CONFIRMED",
      "SENT_TO_KITCHEN",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(targetStatus)) {
      throw new BadRequestError(`Invalid order status '${data.status}'`);
    }

    // Check authorization: Admin or Tenant involved in the order
    const isTenantInvolved = existing.tenantOrders.some(
      (to) => to.tenant.ownerId === user.id,
    );

    if (user.role !== "admin" && !isTenantInvolved) {
      throw new ForbiddenError(
        "Only admins or stall owners involved in this order can update its overall status",
      );
    }

    await db
      .update(orders)
      .set({
        orderStatus: targetStatus as any,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Log status change
    await db.insert(orderStatusLogs).values({
      id: crypto.randomUUID(),
      orderId: id,
      status: targetStatus,
      description: `Status changed to ${targetStatus} by ${user.email} (${user.role})`,
      createdAt: new Date(),
    });

    // If completed or cancelled: close dining session & release table
    if (targetStatus === "COMPLETED" || targetStatus === "CANCELLED") {
      if (existing.sessionId) {
        await db
          .update(diningSessions)
          .set({ status: targetStatus as any, updatedAt: new Date() })
          .where(eq(diningSessions.id, existing.sessionId));
      }

      if (existing.tableId) {
        await db
          .update(tables)
          .set({ status: "available", updatedAt: new Date() })
          .where(eq(tables.id, existing.tableId));
      }

      // Mark all tenant orders completed if order is completed
      if (targetStatus === "COMPLETED") {
        await db
          .update(tenantOrders)
          .set({ status: "COMPLETED", updatedAt: new Date() })
          .where(eq(tenantOrders.orderId, id));
      }
    }

    return this.getById(id);
  }

  async updateTenantOrderStatus(
    tenantOrderId: string,
    data: UpdateTenantOrderStatusDTOType,
    user: AuthUser,
  ) {
    const tOrder = await db.query.tenantOrders.findFirst({
      where: eq(tenantOrders.id, tenantOrderId),
      with: { tenant: true, order: true },
    });

    if (!tOrder) {
      throw new NotFoundError(`Tenant order '${tenantOrderId}' not found`);
    }

    if (user.role !== "admin" && tOrder.tenant.ownerId !== user.id) {
      throw new ForbiddenError("You can only update your own stall's orders");
    }

    await db
      .update(tenantOrders)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(tenantOrders.id, tenantOrderId));

    // Update kitchen queue status
    if (data.status === "PREPARING") {
      await db
        .update(kitchenQueues)
        .set({ status: "COOKING", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenQueues.tenantOrderId, tenantOrderId));
    } else if (data.status === "READY") {
      await db
        .update(kitchenQueues)
        .set({ status: "READY", finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenQueues.tenantOrderId, tenantOrderId));
    } else if (data.status === "COMPLETED") {
      await db
        .update(kitchenQueues)
        .set({ status: "PICKED_UP", finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenQueues.tenantOrderId, tenantOrderId));

      // Check if all tenant orders are now completed
      const allOrders = await db.query.tenantOrders.findMany({
        where: eq(tenantOrders.orderId, tOrder.orderId),
      });

      const allCompleted = allOrders.every((o) =>
        o.id === tenantOrderId ? true : o.status === "COMPLETED",
      );

      if (allCompleted) {
        await this.updateStatus(
          tOrder.orderId,
          { status: "COMPLETED" },
          user,
        );
      }
    }

    return this.getById(tOrder.orderId);
  }

  async updateItemStatus(
    itemId: string,
    data: UpdateOrderItemStatusDTOType,
    user: AuthUser,
  ) {
    const item = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
      with: {
        tenantOrder: {
          with: {
            tenant: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError(`Order item '${itemId}' not found`);
    }

    if (
      user.role !== "admin" &&
      item.tenantOrder.tenant.ownerId !== user.id
    ) {
      throw new ForbiddenError(
        "You can only update the status of your own stall's items",
      );
    }

    // Map itemStatus to tenant order status
    let mappedStatus: "QUEUED" | "PREPARING" | "READY" | "COMPLETED" = "QUEUED";
    if (data.itemStatus === "cooking") mappedStatus = "PREPARING";
    if (data.itemStatus === "ready") mappedStatus = "READY";
    if (data.itemStatus === "served") mappedStatus = "COMPLETED";

    await this.updateTenantOrderStatus(
      item.tenantOrderId,
      { status: mappedStatus },
      user,
    );

    return this.getById(item.tenantOrder.orderId);
  }

  async getAll(
    currentUser: AuthUser | null,
    filter: { status?: string; tableId?: string; sessionId?: string },
  ) {
    if (currentUser?.role === "admin") {
      return db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        with: {
          session: { with: { table: true } },
          tenantOrders: { with: { tenant: true } },
        },
      });
    }

    if (currentUser?.role === "tenant") {
      const ownedTenants = await db.query.tenants.findMany({
        where: eq(tenants.ownerId, currentUser.id),
      });
      const tenantIds = ownedTenants.map((t) => t.id);
      if (tenantIds.length === 0) return [];

      const relevantTenantOrders = await db.query.tenantOrders.findMany({
        where: inArray(tenantOrders.tenantId, tenantIds),
        with: {
          order: {
            with: {
              session: { with: { table: true } },
            },
          },
          items: true,
          kitchenQueue: true,
        },
      });

      return relevantTenantOrders;
    }

    if (filter.tableId) {
      const sessions = await db.query.diningSessions.findMany({
        where: eq(diningSessions.tableId, filter.tableId),
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length === 0) return [];

      return db.query.orders.findMany({
        where: inArray(orders.sessionId, sessionIds),
        orderBy: [desc(orders.createdAt)],
        with: {
          session: { with: { table: true } },
          tenantOrders: { with: { tenant: true } },
        },
      });
    }

    return db.query.orders.findMany({
      limit: 20,
      orderBy: [desc(orders.createdAt)],
      with: {
        session: { with: { table: true } },
        tenantOrders: { with: { tenant: true } },
      },
    });
  }
}

export const orderService = new OrderService();
