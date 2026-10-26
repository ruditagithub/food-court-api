import { and, desc, eq, inArray, isNull, lte, gte, ne, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  discounts,
  foodCourts,
  menus,
  menuOptions,
  tenants,
} from "../../db/schema";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import type {
  CreateDiscountInput,
  Discount,
  DiscountCalculationResult,
  GetDiscountsQueryInput,
  UpdateDiscountInput,
  ValidateDiscountInput,
} from "./model";

export class DiscountService {
  /**
   * Validate a discount code or ID against the current cart items.
   */
  async validateDiscount(
    input: ValidateDiscountInput,
  ): Promise<DiscountCalculationResult> {
    if (!input.discountId && !input.discountCode) {
      throw new BadRequestError("Kode voucher atau ID voucher harus diisi");
    }

    let discount: Discount | undefined;

    if (input.discountId) {
      discount = await db.query.discounts.findFirst({
        where: eq(discounts.id, input.discountId),
      });
    } else if (input.discountCode) {
      const trimmedCode = input.discountCode.trim();
      discount = await db.query.discounts.findFirst({
        where: and(
          eq(discounts.foodCourtId, input.foodCourtId),
          sql`LOWER(${discounts.code}) = LOWER(${trimmedCode})`,
        ),
      });
    }

    if (!discount) {
      throw new NotFoundError("Voucher tidak ditemukan");
    }

    if (discount.foodCourtId !== input.foodCourtId) {
      throw new BadRequestError("Voucher tidak berlaku untuk food court ini");
    }

    if (!discount.isPublic) {
      if (
        !input.discountCode ||
        input.discountCode.trim().toLowerCase() !== discount.code?.toLowerCase()
      ) {
        throw new BadRequestError(
          "Voucher rahasia memerlukan kode promo yang valid",
        );
      }
    }

    if (discount.status !== "ACTIVE") {
      throw new BadRequestError("Voucher tidak aktif atau sudah tidak berlaku");
    }

    const now = new Date();
    if (new Date(discount.startDate) > now || new Date(discount.endDate) < now) {
      throw new BadRequestError("Voucher sudah kedaluwarsa atau belum dimulai");
    }

    if (
      discount.usageLimit !== null &&
      discount.usageLimit !== undefined &&
      discount.usageCount >= discount.usageLimit
    ) {
      throw new BadRequestError("Kuota pemakaian voucher telah habis");
    }

    if (!input.items || input.items.length === 0) {
      throw new BadRequestError("Daftar pesanan tidak boleh kosong");
    }

    // Fetch menus in cart
    const menuIds = Array.from(new Set(input.items.map((it) => it.menuId)));
    const menuList = await db.query.menus.findMany({
      where: inArray(menus.id, menuIds),
      with: {
        options: true,
      },
    });

    const menuMap = new Map(menuList.map((m) => [m.id, m]));

    let overallSubtotal = 0;
    let qualifyingSubtotal = 0;

    for (const item of input.items) {
      const menu = menuMap.get(item.menuId);
      if (!menu) {
        throw new NotFoundError(`Menu dengan ID ${item.menuId} tidak ditemukan`);
      }

      let itemUnitPrice = menu.price;
      if (item.optionIds && item.optionIds.length > 0) {
        const optionMap = new Map(menu.options.map((opt) => [opt.id, opt]));
        for (const optId of new Set(item.optionIds)) {
          const opt = optionMap.get(optId);
          if (opt) {
            itemUnitPrice += opt.priceAdjustment;
          }
        }
      }
      itemUnitPrice = Math.max(0, itemUnitPrice);

      const lineTotal = itemUnitPrice * item.quantity;
      overallSubtotal += lineTotal;

      if (!discount.tenantId) {
        // Food Court wide discount
        qualifyingSubtotal += lineTotal;
      } else if (discount.tenantId === menu.tenantId) {
        // Tenant specific discount
        qualifyingSubtotal += lineTotal;
      }
    }

    if (discount.tenantId && qualifyingSubtotal === 0) {
      throw new BadRequestError(
        "Promo ini hanya berlaku untuk menu dari tenant terkait",
      );
    }

    if (qualifyingSubtotal < discount.minOrderAmount) {
      throw new BadRequestError(
        `Minimal belanja untuk promo ini adalah Rp ${discount.minOrderAmount.toLocaleString("id-ID")}`,
      );
    }

    // Calculate raw discount
    let discountAmount = 0;
    if (discount.type === "PERCENTAGE") {
      const raw = Math.round((qualifyingSubtotal * discount.value) / 100);
      discountAmount = discount.maxDiscountAmount
        ? Math.min(raw, discount.maxDiscountAmount)
        : raw;
    } else {
      discountAmount = discount.value;
    }
    discountAmount = Math.min(discountAmount, qualifyingSubtotal);

    const discountedSubtotal = Math.max(0, overallSubtotal - discountAmount);
    const serviceFee = Math.round(discountedSubtotal * 0.03);
    const taxAmount = Math.round(discountedSubtotal * 0.1);
    const totalAmount = discountedSubtotal + serviceFee + taxAmount;

    return {
      valid: true,
      discount,
      qualifyingSubtotal,
      discountAmount,
      subtotal: overallSubtotal,
      discountedSubtotal,
      serviceFee,
      taxAmount,
      totalAmount,
    };
  }

  /**
   * Get public active vouchers for customer checkout.
   */
  async getPublicDiscounts(
    foodCourtId: string,
    tenantId?: string,
  ): Promise<Discount[]> {
    const now = new Date();

    const conditions = [
      eq(discounts.foodCourtId, foodCourtId),
      eq(discounts.isPublic, true),
      eq(discounts.status, "ACTIVE"),
      lte(discounts.startDate, now),
      gte(discounts.endDate, now),
      or(
        isNull(discounts.usageLimit),
        sql`${discounts.usageCount} < ${discounts.usageLimit}`,
      ),
    ];

    if (tenantId) {
      const tenantIds = tenantId
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (tenantIds.length === 1) {
        conditions.push(
          or(isNull(discounts.tenantId), eq(discounts.tenantId, tenantIds[0]))!,
        );
      } else if (tenantIds.length > 1) {
        conditions.push(
          or(isNull(discounts.tenantId), inArray(discounts.tenantId, tenantIds))!,
        );
      }
    }

    return (await db.query.discounts.findMany({
      where: and(...conditions),
      with: {
        tenant: true,
        foodCourt: true,
      },
      orderBy: [desc(discounts.createdAt)],
    })) as unknown as Discount[];
  }

  /**
   * Create discount with authorization checks.
   */
  async createDiscount(
    data: CreateDiscountInput,
    user: AuthUser,
  ): Promise<Discount> {
    let tenantId = data.tenantId ?? null;
    let scope = data.scope;

    if (user.role === "tenant") {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, user.id),
      });
      if (!tenant) {
        throw new ForbiddenError("Profil tenant tidak ditemukan untuk akun ini");
      }
      if (tenant.foodCourtId !== data.foodCourtId) {
        throw new ForbiddenError(
          "Anda hanya dapat membuat promo untuk food court tempat kios Anda terdaftar",
        );
      }
      tenantId = tenant.id;
      scope = "TENANT";
    } else if (user.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: and(
          eq(foodCourts.id, data.foodCourtId),
          eq(foodCourts.managerId, user.id),
        ),
      });
      if (!fc) {
        throw new ForbiddenError(
          "Anda tidak memiliki hak akses untuk mengelola promo di food court ini",
        );
      }
    }

    if (scope === "TENANT" && !tenantId) {
      throw new BadRequestError(
        "Tenant harus dipilih untuk promo dengan lingkup TENANT",
      );
    }
    if (scope === "FOOD_COURT") {
      tenantId = null;
    }

    if (data.type === "PERCENTAGE" && data.value > 100) {
      throw new BadRequestError("Persentase diskon tidak boleh melebihi 100%");
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError("Format tanggal promo tidak valid");
    }
    if (start >= end) {
      throw new BadRequestError(
        "Tanggal mulai harus lebih awal dari tanggal berakhir",
      );
    }

    if (data.code && data.code.trim()) {
      const trimmedCode = data.code.trim();
      const existing = await db.query.discounts.findFirst({
        where: sql`LOWER(${discounts.code}) = LOWER(${trimmedCode})`,
      });
      if (existing) {
        throw new BadRequestError(
          `Kode promo "${trimmedCode}" sudah digunakan`,
        );
      }
    }

    const id = crypto.randomUUID();
    const newRecord = {
      id,
      foodCourtId: data.foodCourtId,
      tenantId,
      code: data.code?.trim() || null,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      scope,
      type: data.type,
      value: data.value,
      maxDiscountAmount: data.maxDiscountAmount ?? null,
      minOrderAmount: data.minOrderAmount ?? 0,
      isPublic: data.isPublic ?? true,
      usageLimit: data.usageLimit ?? null,
      usageCount: 0,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: (data.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE" | "EXPIRED",
    };

    await db.insert(discounts).values(newRecord);

    const created = await db.query.discounts.findFirst({
      where: eq(discounts.id, id),
    });
    if (!created) {
      throw new NotFoundError("Gagal mengambil data promo yang baru dibuat");
    }
    return created;
  }

  /**
   * List discounts for management (admin, admin-food-court, tenant).
   */
  async getDiscounts(
    query: GetDiscountsQueryInput,
    user: AuthUser,
  ): Promise<Discount[]> {
    const conditions: any[] = [];

    if (user.role === "tenant") {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, user.id),
      });
      if (!tenant) {
        return [];
      }
      conditions.push(eq(discounts.tenantId, tenant.id));
    } else if (user.role === "admin-food-court") {
      const managed = await db.query.foodCourts.findMany({
        where: eq(foodCourts.managerId, user.id),
      });
      const managedIds = managed.map((fc) => fc.id);
      if (managedIds.length === 0) {
        return [];
      }
      conditions.push(inArray(discounts.foodCourtId, managedIds));
    }

    if (query.foodCourtId) {
      conditions.push(eq(discounts.foodCourtId, query.foodCourtId));
    }
    if (query.tenantId) {
      conditions.push(eq(discounts.tenantId, query.tenantId));
    }
    if (query.status) {
      conditions.push(eq(discounts.status, query.status as any));
    }
    if (query.isPublic !== undefined) {
      conditions.push(eq(discounts.isPublic, query.isPublic === "true"));
    }
    if (query.search) {
      conditions.push(sql`LOWER(${discounts.name}) LIKE LOWER(${`%${query.search}%`})`);
    }

    return (await db.query.discounts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        tenant: true,
        foodCourt: true,
      },
      orderBy: [desc(discounts.createdAt)],
    })) as unknown as Discount[];
  }

  /**
   * Get single discount detail.
   */
  async getDiscountById(id: string): Promise<Discount> {
    const discount = await db.query.discounts.findFirst({
      where: eq(discounts.id, id),
      with: {
        tenant: true,
        foodCourt: true,
      },
    });
    if (!discount) {
      throw new NotFoundError("Voucher promo tidak ditemukan");
    }
    return discount as unknown as Discount;
  }

  /**
   * Update discount with authorization checks.
   */
  async updateDiscount(
    id: string,
    data: UpdateDiscountInput,
    user: AuthUser,
  ): Promise<Discount> {
    const existing = await this.getDiscountById(id);

    if (user.role === "tenant") {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, user.id),
      });
      if (!tenant || existing.tenantId !== tenant.id) {
        throw new ForbiddenError("Anda tidak memiliki izin mengedit promo ini");
      }
    } else if (user.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: and(
          eq(foodCourts.id, existing.foodCourtId),
          eq(foodCourts.managerId, user.id),
        ),
      });
      if (!fc) {
        throw new ForbiddenError(
          "Anda tidak memiliki izin mengedit promo di food court ini",
        );
      }
    }

    if (data.code && data.code.trim()) {
      const trimmedCode = data.code.trim();
      const duplicate = await db.query.discounts.findFirst({
        where: and(
          sql`LOWER(${discounts.code}) = LOWER(${trimmedCode})`,
          ne(discounts.id, id),
        ),
      });
      if (duplicate) {
        throw new BadRequestError(
          `Kode promo "${trimmedCode}" sudah digunakan`,
        );
      }
    }

    const effectiveType = data.type ?? existing.type;
    const effectiveValue = data.value ?? existing.value;
    if (effectiveType === "PERCENTAGE" && effectiveValue > 100) {
      throw new BadRequestError("Persentase diskon tidak boleh melebihi 100%");
    }

    const effectiveStartDate = data.startDate
      ? new Date(data.startDate)
      : new Date(existing.startDate);
    const effectiveEndDate = data.endDate
      ? new Date(data.endDate)
      : new Date(existing.endDate);
    if (
      isNaN(effectiveStartDate.getTime()) ||
      isNaN(effectiveEndDate.getTime())
    ) {
      throw new BadRequestError("Format tanggal promo tidak valid");
    }
    if (effectiveStartDate >= effectiveEndDate) {
      throw new BadRequestError(
        "Tanggal mulai harus lebih awal dari tanggal berakhir",
      );
    }

    const effectiveScope =
      data.scope !== undefined && user.role !== "tenant"
        ? data.scope
        : existing.scope;
    let effectiveTenantId =
      data.tenantId !== undefined && user.role !== "tenant"
        ? data.tenantId
        : existing.tenantId;

    if (effectiveScope === "TENANT" && !effectiveTenantId) {
      throw new BadRequestError(
        "Tenant harus dipilih untuk promo dengan lingkup TENANT",
      );
    }
    if (effectiveScope === "FOOD_COURT") {
      effectiveTenantId = null;
    }

    const updatePayload: Partial<typeof discounts.$inferInsert> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined)
      updatePayload.description = data.description?.trim() || null;
    if (data.scope !== undefined && user.role !== "tenant")
      updatePayload.scope = effectiveScope;
    if (
      (data.tenantId !== undefined && user.role !== "tenant") ||
      effectiveScope === "FOOD_COURT"
    )
      updatePayload.tenantId = effectiveTenantId;
    if (data.code !== undefined)
      updatePayload.code = data.code?.trim() || null;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.value !== undefined) updatePayload.value = data.value;
    if (data.maxDiscountAmount !== undefined)
      updatePayload.maxDiscountAmount = data.maxDiscountAmount;
    if (data.minOrderAmount !== undefined)
      updatePayload.minOrderAmount = data.minOrderAmount;
    if (data.isPublic !== undefined) updatePayload.isPublic = data.isPublic;
    if (data.usageLimit !== undefined)
      updatePayload.usageLimit = data.usageLimit;
    if (data.startDate !== undefined)
      updatePayload.startDate = effectiveStartDate;
    if (data.endDate !== undefined)
      updatePayload.endDate = effectiveEndDate;
    if (data.status !== undefined)
      updatePayload.status = data.status as any;

    await db.update(discounts).set(updatePayload).where(eq(discounts.id, id));

    return await this.getDiscountById(id);
  }

  /**
   * Deactivate discount.
   */
  async deleteDiscount(
    id: string,
    user: AuthUser,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.getDiscountById(id);

    if (user.role === "tenant") {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, user.id),
      });
      if (!tenant || existing.tenantId !== tenant.id) {
        throw new ForbiddenError("Anda tidak memiliki izin menghapus promo ini");
      }
    } else if (user.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: and(
          eq(foodCourts.id, existing.foodCourtId),
          eq(foodCourts.managerId, user.id),
        ),
      });
      if (!fc) {
        throw new ForbiddenError(
          "Anda tidak memiliki izin menghapus promo di food court ini",
        );
      }
    }

    // Set status to INACTIVE for safety and history preservation
    await db
      .update(discounts)
      .set({ status: "INACTIVE" })
      .where(eq(discounts.id, id));

    return {
      success: true,
      message: "Promo berhasil dinonaktifkan",
    };
  }
}

export const discountService = new DiscountService();
