import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import {
  diningSessions,
  discounts,
  foodCourts,
  kiosks,
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
import { discountService } from "../discounts/service";
import type {
  CreateOrderDTOType,
  SplitBillDTOType,
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

  async completePayment(orderId: string) {
    await this.reserveStock(orderId);
  }

  private async reserveStock(orderId: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        tenantOrders: {
          with: {
            items: true,
          },
        },
      },
    });

    if (!order) return;

    // Collect all menu items with quantities
    const stockUpdates = new Map<string, number>();

    for (const tenantOrder of order.tenantOrders) {
      for (const item of tenantOrder.items) {
        if (!item.menuId) continue;
        const existing = stockUpdates.get(item.menuId) || 0;
        stockUpdates.set(item.menuId, existing + item.quantity);
      }
    }

    // Update stocks in transaction
    for (const [menuId, qty] of stockUpdates.entries()) {
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, menuId),
      });

      if (!menu) continue;

      const newStock = menu.stock - qty;

      await db
        .update(menus)
        .set({
          stock: newStock,
          status: newStock <= 0 ? "OUT_OF_STOCK" : menu.status,
          updatedAt: new Date(),
        })
        .where(eq(menus.id, menuId));
    }
  }

  private async releaseStock(orderId: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        tenantOrders: {
          with: {
            items: true,
          },
        },
      },
    });

    if (!order || order.paymentStatus !== "PAID") return;

    // Collect all menu items with quantities
    const stockUpdates = new Map<string, number>();

    for (const tenantOrder of order.tenantOrders) {
      for (const item of tenantOrder.items) {
        if (!item.menuId) continue;
        const existing = stockUpdates.get(item.menuId) || 0;
        stockUpdates.set(item.menuId, existing + item.quantity);
      }
    }

    // Restore stocks
    for (const [menuId, qty] of stockUpdates.entries()) {
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, menuId),
      });

      if (!menu) continue;

      const newStock = menu.stock + qty;

      await db
        .update(menus)
        .set({
          stock: newStock,
          status: menu.status === "OUT_OF_STOCK" ? "AVAILABLE" : menu.status,
          updatedAt: new Date(),
        })
        .where(eq(menus.id, menuId));
    }
  }

  async createOrder(data: CreateOrderDTOType, currentUser: AuthUser | null = null) {
    return this.create(data, currentUser);
  }

  async create(data: CreateOrderDTOType, currentUser: AuthUser | null) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Order must contain at least one item");
    }

    let sessionId = data.sessionId;
    let tableRecord: typeof tables.$inferSelect | undefined;
    let targetFoodCourtId = "";

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
      targetFoodCourtId = existingSession.foodCourtId;
    } else if (data.tableId) {
      tableRecord = await db.query.tables.findFirst({
        where: eq(tables.id, data.tableId),
      });
      if (!tableRecord) {
        throw new NotFoundError(`Table '${data.tableId}' not found`);
      }
      targetFoodCourtId = tableRecord.foodCourtId;

      // Check for an existing active session on this table
      const activeSession = await db.query.diningSessions.findFirst({
        where: and(
          eq(diningSessions.tableId, data.tableId),
          eq(diningSessions.status, "ACTIVE"),
        ),
      });

      if (activeSession) {
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
    } else if (data.kioskId) {
      const kioskRecord = await db.query.kiosks.findFirst({
        where: eq(kiosks.id, data.kioskId),
      });
      if (!kioskRecord) {
        throw new NotFoundError(`Kiosk '${data.kioskId}' not found`);
      }
      if (kioskRecord.status === "INACTIVE") {
        throw new BadRequestError(
          `Perangkat Kiosk '${kioskRecord.kioskName}' sedang tidak aktif`,
        );
      }

      targetFoodCourtId = kioskRecord.foodCourtId;
      sessionId = crypto.randomUUID();
      const sessionCode = `KSK-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

      await db.insert(diningSessions).values({
        id: sessionId,
        foodCourtId: kioskRecord.foodCourtId,
        kioskId: kioskRecord.id,
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
    } else {
      // Direct takeaway without table
      const defaultCourtId = await this.getOrCreateDefaultFoodCourt();
      targetFoodCourtId = defaultCourtId;
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

    // Fetch or create participant for bill allocation matching customerName
    const desiredName =
      data.customerName?.trim() || (currentUser ? currentUser.name : "Guest");
    let participant = await db.query.sessionParticipants.findFirst({
      where: and(
        eq(sessionParticipants.sessionId, sessionId!),
        eq(sessionParticipants.name, desiredName),
      ),
    });

    if (!participant) {
      const participantId = crypto.randomUUID();
      await db.insert(sessionParticipants).values({
        id: participantId,
        sessionId: sessionId!,
        userId: currentUser?.id ?? null,
        name: desiredName,
        isHost: false,
        joinedAt: new Date(),
      });
      participant = {
        id: participantId,
        name: desiredName,
      } as typeof sessionParticipants.$inferSelect;
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
      if (menuItem.stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for '${menuItem.name}'. Available: ${menuItem.stock}, Requested: ${item.quantity}`,
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
          const uniqueOptionIds = new Set(item.optionIds);
          if (uniqueOptionIds.size !== item.optionIds.length) {
            throw new BadRequestError(
              `Duplicate option selected for menu '${menuItem.name}'`,
            );
          }

          for (const optId of item.optionIds) {
            const opt = optionMap.get(optId);
            if (!opt || opt.menuId !== menuItem.id) {
              throw new BadRequestError(
                `Option with id '${optId}' is invalid for menu '${menuItem.name}'`,
              );
            }
            unitPrice += opt.priceAdjustment;
            itemOptions.push({
              id: crypto.randomUUID(),
              name: opt.name,
              priceAdjustment: opt.priceAdjustment,
            });
          }
        }

        if (unitPrice < 0) {
          throw new BadRequestError(
            `Effective unit price for '${menuItem.name}' cannot be negative`,
          );
        }

        const itemSubtotal = unitPrice * item.quantity;
        tenantSubtotal += itemSubtotal;

        const resolvedNote =
          (item.notes ?? item.specialNotes ?? item.specialInstructions)?.trim() || null;

        preparedItems.push({
          id: crypto.randomUUID(),
          menuId: menuItem.id,
          menuNameSnapshot: menuItem.name,
          unitPriceSnapshot: unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: resolvedNote,
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

    // 1. Discount Validation & Calculation
    let masterDiscountAmount = 0;
    let appliedDiscountId: string | null = null;
    if (data.discountCode || data.discountId) {
      const discountRes = await discountService.validateDiscount({
        foodCourtId: targetFoodCourtId,
        discountCode: data.discountCode,
        discountId: data.discountId,
        items: data.items,
      });
      masterDiscountAmount = discountRes.discountAmount;
      appliedDiscountId = discountRes.discount.id;
    }

    // 2. Enforce voucher quota atomically if discount applied
    if (appliedDiscountId) {
      const [updateResult]: any = await db
        .update(discounts)
        .set({
          usageCount: sql`${discounts.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(discounts.id, appliedDiscountId),
            or(
              isNull(discounts.usageLimit),
              sql`${discounts.usageCount} < ${discounts.usageLimit}`,
            ),
          ),
        );

      if (updateResult.affectedRows === 0) {
        throw new BadRequestError("Kuota pemakaian voucher telah habis");
      }
    }

    // 3. Insert Master Order
    const masterSubtotal = overallTotal;
    const discountedSubtotal = Math.max(0, masterSubtotal - masterDiscountAmount);
    const masterServiceFee = Math.round(discountedSubtotal * 0.03);
    const masterTaxAmount = Math.round(discountedSubtotal * 0.10);
    const masterTotalAmount = discountedSubtotal + masterServiceFee + masterTaxAmount;

    await db.insert(orders).values({
      id: orderId,
      sessionId: sessionId!,
      orderNumber,
      subtotal: masterSubtotal,
      taxAmount: masterTaxAmount,
      serviceFee: masterServiceFee,
      discountAmount: masterDiscountAmount,
      discountId: appliedDiscountId,
      totalAmount: masterTotalAmount,
      paymentStatus: "PENDING",
      orderStatus: "DRAFT",
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
      amountDue: masterTotalAmount,
      amountPaid: 0,
      discountAmount: masterDiscountAmount,
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
      description: `Order created by ${desiredName}${data.notes ? ` (Notes: ${data.notes})` : ""}`,
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
            items: {
              with: {
                orderItem: {
                  with: {
                    options: true,
                  },
                },
              },
            },
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
    const resolvedCustomerName =
      order.paymentGroups?.[0]?.participant?.name ??
      order.session?.participants?.[0]?.name ??
      null;

    const statusMapped =
      order.orderStatus === "DRAFT"
        ? "pending"
        : order.orderStatus.toLowerCase();

        const formattedPaymentGroups = order.paymentGroups.map((pg: any) => {
      const itemsList = (pg.items ?? []).map((pgi: any) => {
        const oi = pgi.orderItem;
        const unitPrice =
          oi && oi.quantity > 0
            ? Math.round(oi.subtotal / oi.quantity)
            : pgi.allocatedAmount;
        const allocatedQty =
          unitPrice > 0 ? Math.max(1, Math.round(pgi.allocatedAmount / unitPrice)) : 1;
        return {
          id: pgi.id,
          orderItemId: pgi.orderItemId,
          menuName: oi?.menuNameSnapshot ?? "Menu",
          quantity: allocatedQty,
          unitPrice,
          allocatedAmount: pgi.allocatedAmount,
          notes: oi?.notes ?? null,
          options: (oi?.options ?? []).map((o: any) => o.optionNameSnapshot ?? o.name),
        };
      });
      const groupSubtotal = itemsList.reduce((acc: number, it: any) => acc + (it.allocatedAmount || 0), 0);
      const groupDiscount = pg.discountAmount ?? 0;
      const groupDiscountedSubtotal = Math.max(0, groupSubtotal - groupDiscount);
      const groupService = Math.round(groupDiscountedSubtotal * 0.03);
      const groupTax = Math.round(groupDiscountedSubtotal * 0.10);

      return {
        id: pg.id,
        orderId: pg.orderId,
        participantId: pg.participantId,
        participantName: pg.participant?.name ?? "Tamu",
        subtotal: groupSubtotal,
        discountAmount: groupDiscount,
        discountedSubtotal: groupDiscountedSubtotal,
        serviceFee: groupService,
        taxAmount: groupTax,
        amountDue: pg.amountDue,
        amountPaid: pg.amountPaid,
        status: pg.status,
        items: itemsList,
        payments: pg.payments ?? [],
      };
    });

    return {
      ...order,
      customerName: resolvedCustomerName,
      status: statusMapped,
      totalPrice: order.totalAmount,
      tableId: order.session?.tableId ?? null,
      table: order.session?.table ?? null,
      items: allItems,
      payment: firstPayment ?? null,
      paymentGroups: formattedPaymentGroups,
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
            participants: true,
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
            participant: true,
            items: {
              with: {
                orderItem: {
                  with: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with number '${orderNumber}' not found`);
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      serviceFee: order.serviceFee,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      customerName:
        order.paymentGroups?.[0]?.participant?.name ??
        order.session?.participants?.[0]?.name ??
        null,
      foodCourtName: order.session?.foodCourt?.name ?? null,
      tableNumber: order.session?.table?.tableNumber ?? "Takeaway",
      sessionCode: order.session?.sessionCode,
      createdAt: order.createdAt,
      paymentGroups: order.paymentGroups.map((pg: any) => {
        const itemsList = (pg.items ?? []).map((pgi: any) => {
          const oi = pgi.orderItem;
          const unitPrice =
            oi && oi.quantity > 0
              ? Math.round(oi.subtotal / oi.quantity)
              : pgi.allocatedAmount;
          const allocatedQty =
            unitPrice > 0 ? Math.max(1, Math.round(pgi.allocatedAmount / unitPrice)) : 1;
          return {
            id: pgi.id,
            orderItemId: pgi.orderItemId,
            menuName: oi?.menuNameSnapshot ?? "Menu",
            quantity: allocatedQty,
            unitPrice,
            allocatedAmount: pgi.allocatedAmount,
            notes: oi?.notes ?? null,
            options: (oi?.options ?? []).map((o: any) => o.optionNameSnapshot ?? o.name),
          };
        });
        const groupSubtotal = itemsList.reduce((acc: number, it: any) => acc + (it.allocatedAmount || 0), 0);
        const groupDiscount = pg.discountAmount ?? 0;
        const groupDiscountedSubtotal = Math.max(0, groupSubtotal - groupDiscount);
        const groupService = Math.round(groupDiscountedSubtotal * 0.03);
        const groupTax = Math.round(groupDiscountedSubtotal * 0.10);

        return {
          id: pg.id,
          orderId: pg.orderId,
          participantId: pg.participantId,
          participantName: pg.participant?.name ?? "Tamu",
          subtotal: groupSubtotal,
          discountAmount: groupDiscount,
          discountedSubtotal: groupDiscountedSubtotal,
          serviceFee: groupService,
          taxAmount: groupTax,
          amountDue: pg.amountDue,
          amountPaid: pg.amountPaid,
          status: pg.status,
          items: itemsList,
          payments: pg.payments ?? [],
        };
      }),
      stalls: order.tenantOrders.map((to) => ({
        id: to.id,
        tenantId: to.tenantId,
        tenantName: to.tenant.name,
        stallNumber: to.tenant.stallNumber,
        subtotal: to.subtotal,
        status: to.status,
        queueNumber: to.kitchenQueue?.queueNumber ?? "-",
        items: to.items.map((item) => ({
          id: item.id,
          name: item.menuNameSnapshot,
          unitPrice: item.unitPriceSnapshot,
          quantity: item.quantity,
          subtotal: item.subtotal,
          notes: item.notes ?? null,
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
        where: and(
          eq(diningSessions.tableId, table.id),
          eq(diningSessions.status, "ACTIVE"),
        ),
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

    // If completed or cancelled: close dining session & release table when all orders in session are done
    if (targetStatus === "COMPLETED" || targetStatus === "CANCELLED") {
      if (targetStatus === "CANCELLED") {
        await this.releaseStock(id);
      }

      if (existing.sessionId) {
        const sessionOrders = await db.query.orders.findMany({
          where: eq(orders.sessionId, existing.sessionId),
        });
        const allSessionOrdersDone = sessionOrders.every(
          (o) =>
            o.id === id ||
            o.orderStatus === "COMPLETED" ||
            o.orderStatus === "CANCELLED",
        );

        if (allSessionOrdersDone) {
          await db
            .update(diningSessions)
            .set({ status: targetStatus as any, updatedAt: new Date() })
            .where(eq(diningSessions.id, existing.sessionId));

          if (existing.tableId) {
            await db
              .update(tables)
              .set({ status: "available", updatedAt: new Date() })
              .where(eq(tables.id, existing.tableId));
          }
        }
      }

      // Mark all tenant orders completed if order is completed
      if (targetStatus === "COMPLETED") {
        await db
          .update(tenantOrders)
          .set({ status: "COMPLETED", updatedAt: new Date() })
          .where(eq(tenantOrders.orderId, id));
      }

      // Mark all tenant orders cancelled if order is cancelled
      if (targetStatus === "CANCELLED") {
        await db
          .update(tenantOrders)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(eq(tenantOrders.orderId, id));

        const tOrders = await db.query.tenantOrders.findMany({
          where: eq(tenantOrders.orderId, id),
        });
        const tOrderIds = tOrders.map((to) => to.id);
        if (tOrderIds.length > 0) {
          await db
            .delete(kitchenQueues)
            .where(inArray(kitchenQueues.tenantOrderId, tOrderIds));
        }

        // Restore discount quota if order had an applied discount
        if (existing.discountId) {
          await db
            .update(discounts)
            .set({
              usageCount: sql`GREATEST(0, ${discounts.usageCount} - 1)`,
              updatedAt: new Date(),
            })
            .where(eq(discounts.id, existing.discountId));
        }
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

    const targetStatus = data.status.toUpperCase();

    await db
      .update(tenantOrders)
      .set({ status: targetStatus as any, updatedAt: new Date() })
      .where(eq(tenantOrders.id, tenantOrderId));

    // Update kitchen queue status
    if (targetStatus === "PREPARING") {
      await db
        .update(kitchenQueues)
        .set({ status: "COOKING", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenQueues.tenantOrderId, tenantOrderId));
    } else if (targetStatus === "READY") {
      await db
        .update(kitchenQueues)
        .set({ status: "READY", finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(kitchenQueues.tenantOrderId, tenantOrderId));
    } else if (targetStatus === "COMPLETED") {
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
    } else if (targetStatus === "CANCELLED") {
      // Remove kitchen queue for this tenant order
      await db
        .delete(kitchenQueues)
        .where(eq(kitchenQueues.tenantOrderId, tenantOrderId));

      // Restore stock for items in this tenant order
      const tOrderItems = await db.query.orderItems.findMany({
        where: eq(orderItems.tenantOrderId, tenantOrderId),
      });

      for (const item of tOrderItems) {
        if (!item.menuId) continue;
        const menu = await db.query.menus.findFirst({
          where: eq(menus.id, item.menuId),
        });
        if (menu) {
          const newStock = menu.stock + item.quantity;
          await db
            .update(menus)
            .set({
              stock: newStock,
              status: menu.status === "OUT_OF_STOCK" ? "AVAILABLE" : menu.status,
              updatedAt: new Date(),
            })
            .where(eq(menus.id, item.menuId));
        }
      }

      // Check if all tenant orders are now cancelled
      const allOrders = await db.query.tenantOrders.findMany({
        where: eq(tenantOrders.orderId, tOrder.orderId),
      });

      const allCancelled = allOrders.every((o) =>
        o.id === tenantOrderId ? true : o.status === "CANCELLED",
      );

      if (allCancelled) {
        await this.updateStatus(
          tOrder.orderId,
          { status: "CANCELLED" },
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
    if (currentUser?.role === "admin" || currentUser?.role === "admin-food-court") {
      const list = await db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        with: {
          session: { with: { table: true, participants: true } },
          paymentGroups: { with: { participant: true } },
          tenantOrders: {
            with: {
              tenant: true,
              items: {
                with: {
                  options: true,
                },
              },
            },
          },
        },
      });
      return list.map((ord) => ({
        ...ord,
        customerName:
          ord.paymentGroups?.[0]?.participant?.name ??
          ord.session?.participants?.[0]?.name ??
          null,
        table: ord.session?.table ?? null,
      }));
    }

    if (currentUser?.role === "tenant") {
      const ownedTenants = await db.query.tenants.findMany({
        where: eq(tenants.ownerId, currentUser.id),
      });
      const tenantIds = ownedTenants.map((t) => t.id);
      if (tenantIds.length === 0) return [];

      const relevantTenantOrders = await db.query.tenantOrders.findMany({
        where: inArray(tenantOrders.tenantId, tenantIds),
        orderBy: [desc(tenantOrders.createdAt)],
        with: {
          order: {
            with: {
              session: { with: { table: true, participants: true } },
              paymentGroups: { with: { participant: true } },
            },
          },
          items: {
            with: {
              options: true,
            },
          },
          kitchenQueue: true,
        },
      });

      return relevantTenantOrders.map((to) => {
        const custName =
          to.order?.paymentGroups?.[0]?.participant?.name ??
          to.order?.session?.participants?.[0]?.name ??
          null;
        return {
          ...to,
          customerName: custName,
          tableNumber: to.order?.session?.table?.tableNumber ?? null,
        };
      });
    }

    if (filter.tableId) {
      const sessions = await db.query.diningSessions.findMany({
        where: eq(diningSessions.tableId, filter.tableId),
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length === 0) return [];

      const list = await db.query.orders.findMany({
        where: inArray(orders.sessionId, sessionIds),
        orderBy: [desc(orders.createdAt)],
        with: {
          session: { with: { table: true, participants: true } },
          paymentGroups: { with: { participant: true } },
          tenantOrders: { with: { tenant: true } },
        },
      });
      return list.map((ord) => ({
        ...ord,
        customerName:
          ord.paymentGroups?.[0]?.participant?.name ??
          ord.session?.participants?.[0]?.name ??
          null,
        table: ord.session?.table ?? null,
      }));
    }

    const list = await db.query.orders.findMany({
      limit: 20,
      orderBy: [desc(orders.createdAt)],
      with: {
        session: { with: { table: true, participants: true } },
        paymentGroups: { with: { participant: true } },
        tenantOrders: { with: { tenant: true } },
      },
    });
    return list.map((ord) => ({
      ...ord,
      customerName:
        ord.paymentGroups?.[0]?.participant?.name ??
        ord.session?.participants?.[0]?.name ??
        null,
      table: ord.session?.table ?? null,
    }));
  }

  async configureSplitBill(orderId: string, data: SplitBillDTOType) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        session: { with: { participants: true } },
        tenantOrders: { with: { items: true } },
        paymentGroups: { with: { payments: true } },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with id '${orderId}' not found`);
    }

    if (order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_PAID") {
      throw new BadRequestError(
        "Cannot reconfigure split bill because payment has already started or been completed",
      );
    }

    const hasPaidGroup = (order.paymentGroups || []).some(
      (pg) =>
        pg.status === "PAID" ||
        (pg.amountPaid && Number(pg.amountPaid) > 0) ||
        (pg.payments && pg.payments.some((p: any) => p.status === "SUCCESS" || p.status === "PAID")),
    );
    if (hasPaidGroup) {
      throw new BadRequestError(
        "Cannot reconfigure split bill because one or more payment groups have already been paid",
      );
    }

    const allOrderItems = order.tenantOrders.flatMap((to) => to.items);
    const itemMap = new Map(allOrderItems.map((it) => [it.id, it]));

    // Track allocated quantities per orderItemId
    const allocatedQtyByItemId = new Map<string, number>();

    const preparedGroups: Array<{
      participantName: string;
      subtotal: number;
      discountAmount?: number;
      discountedSubtotal?: number;
      serviceFee: number;
      taxAmount: number;
      amountDue: number;
      allocations: Array<{ orderItemId: string; allocatedAmount: number }>;
    }> = [];

    for (const group of data.groups) {
      const cleanName = group.participantName.trim();
      if (!cleanName) {
        throw new BadRequestError("Participant name cannot be empty");
      }

      // Merge duplicate orderItemIds within the same participant group
      const mergedQtyByItem = new Map<string, number>();
      for (const allocation of group.items) {
        const oi = itemMap.get(allocation.orderItemId);
        if (!oi) {
          throw new BadRequestError(
            `Order item '${allocation.orderItemId}' does not belong to this order`,
          );
        }
        const qty = allocation.quantity ?? 1;
        if (qty <= 0) {
          throw new BadRequestError("Allocated quantity must be at least 1");
        }
        mergedQtyByItem.set(
          allocation.orderItemId,
          (mergedQtyByItem.get(allocation.orderItemId) ?? 0) + qty,
        );
      }

      let groupSubtotal = 0;
      const groupAllocations: Array<{ orderItemId: string; allocatedAmount: number }> = [];

      for (const [orderItemId, qty] of mergedQtyByItem.entries()) {
        const oi = itemMap.get(orderItemId)!;
        const unitEffectivePrice = Math.round(oi.subtotal / oi.quantity);
        const allocatedAmount = unitEffectivePrice * qty;

        groupSubtotal += allocatedAmount;
        groupAllocations.push({ orderItemId, allocatedAmount });

        allocatedQtyByItemId.set(
          orderItemId,
          (allocatedQtyByItemId.get(orderItemId) ?? 0) + qty,
        );
      }

      preparedGroups.push({
        participantName: cleanName,
        subtotal: groupSubtotal,
        serviceFee: 0,
        taxAmount: 0,
        amountDue: 0,
        allocations: groupAllocations,
      });
    }

    // Verify every order item is completely and accurately allocated
    for (const oi of allOrderItems) {
      const totalAllocatedQty = allocatedQtyByItemId.get(oi.id) ?? 0;
      if (totalAllocatedQty !== oi.quantity) {
        throw new BadRequestError(
          `Item '${oi.menuNameSnapshot}' requires quantity ${oi.quantity} to be allocated, but got ${totalAllocatedQty}`,
        );
      }
    }

    // Distribute discount across groups using waterfall / spillover
    const numGroups = preparedGroups.length;
    const totalOrderDiscount = order.discountAmount ?? 0;
    const groupDiscounts = new Array(numGroups).fill(0);

    if (totalOrderDiscount > 0 && numGroups > 0) {
      const baseDiscount = Math.floor(totalOrderDiscount / numGroups);
      let spilloverPool = totalOrderDiscount - baseDiscount * numGroups;

      // Pass 1: Allocate base discount up to group's subtotal
      for (let i = 0; i < numGroups; i++) {
        const sub = preparedGroups[i].subtotal;
        if (sub <= baseDiscount) {
          groupDiscounts[i] = sub;
          spilloverPool += baseDiscount - sub;
        } else {
          groupDiscounts[i] = baseDiscount;
        }
      }

      // Pass 2: Distribute spilloverPool to participants who still have unpaid subtotal
      while (spilloverPool > 0) {
        const eligibleIndices: number[] = [];
        for (let i = 0; i < numGroups; i++) {
          if (preparedGroups[i].subtotal > groupDiscounts[i]) {
            eligibleIndices.push(i);
          }
        }

        if (eligibleIndices.length === 0) {
          break; // All subtotals are completely discounted
        }

        const share = Math.max(
          1,
          Math.floor(spilloverPool / eligibleIndices.length),
        );
        let allocatedInThisRound = 0;

        for (const idx of eligibleIndices) {
          const headroom = preparedGroups[idx].subtotal - groupDiscounts[idx];
          const take = Math.min(share, headroom, spilloverPool);
          groupDiscounts[idx] += take;
          spilloverPool -= take;
          allocatedInThisRound += take;
          if (spilloverPool === 0) break;
        }

        if (allocatedInThisRound === 0) {
          break;
        }
      }
    }

    // Compute discounted financial numbers for each prepared group
    let currentSumDue = 0;
    for (let i = 0; i < numGroups; i++) {
      const g = preparedGroups[i];
      const discount = groupDiscounts[i];
      const discountedSubtotal = Math.max(0, g.subtotal - discount);
      const serviceFee = Math.round(discountedSubtotal * 0.03);
      const taxAmount = Math.round(discountedSubtotal * 0.1);
      const amountDue = discountedSubtotal + serviceFee + taxAmount;

      g.discountAmount = discount;
      g.discountedSubtotal = discountedSubtotal;
      g.serviceFee = serviceFee;
      g.taxAmount = taxAmount;
      g.amountDue = amountDue;
      currentSumDue += amountDue;
    }

    // Ensure sum(amountDue) === order.totalAmount (penny/rupiah rounding adjustment)
    const discrepancy = order.totalAmount - currentSumDue;
    if (discrepancy !== 0 && numGroups > 0) {
      let bestIdx = 0;
      for (let i = 1; i < numGroups; i++) {
        if (preparedGroups[i].amountDue > preparedGroups[bestIdx].amountDue) {
          bestIdx = i;
        }
      }
      preparedGroups[bestIdx].amountDue = Math.max(
        0,
        preparedGroups[bestIdx].amountDue + discrepancy,
      );
    }

    // Remove existing unpaid paymentGroups (cascades to paymentGroupItems and pending payments)
    await db.delete(paymentGroups).where(eq(paymentGroups.orderId, orderId));

    // Create participants & insert new paymentGroups + paymentGroupItems
    for (const pg of preparedGroups) {
      let participant = await db.query.sessionParticipants.findFirst({
        where: and(
          eq(sessionParticipants.sessionId, order.sessionId),
          eq(sessionParticipants.name, pg.participantName),
        ),
      });

      if (!participant) {
        const newParticipantId = crypto.randomUUID();
        await db.insert(sessionParticipants).values({
          id: newParticipantId,
          sessionId: order.sessionId,
          userId: null,
          name: pg.participantName,
          isHost: false,
          joinedAt: new Date(),
        });
        participant = {
          id: newParticipantId,
          name: pg.participantName,
        } as typeof sessionParticipants.$inferSelect;
      }

      const newGroupId = crypto.randomUUID();
      await db.insert(paymentGroups).values({
        id: newGroupId,
        orderId,
        participantId: participant.id,
        amountDue: pg.amountDue,
        amountPaid: 0,
        discountAmount: pg.discountAmount ?? 0,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const alloc of pg.allocations) {
        await db.insert(paymentGroupItems).values({
          id: crypto.randomUUID(),
          paymentGroupId: newGroupId,
          orderItemId: alloc.orderItemId,
          allocatedAmount: alloc.allocatedAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    await db.insert(orderStatusLogs).values({
      id: crypto.randomUUID(),
      orderId,
      status: order.orderStatus,
      description: `Split bill configured for ${preparedGroups.length} participant(s): ${preparedGroups.map((g) => `${g.participantName} (${g.amountDue})`).join(", ")}`,
      createdAt: new Date(),
    });

    return this.getById(orderId);
  }
}

export const orderService = new OrderService();
