import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { mailerService } from "../../common/mailer";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { foodCourts, menus, tenantBalanceLogs, tenants, users, withdrawalRequests } from "../../db/schema";
import { generateSlug } from "../food-courts/service";
import type {
  CreateTenantDTOType,
  ProcessWithdrawalDTOType,
  RequestWithdrawalDTOType,
  UpdateTenantDTOType,
} from "./model";

export class TenantService {
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

  async getAll(
    filter?: { isOpen?: boolean; foodCourtId?: string },
    currentUser?: AuthUser | null,
  ) {
    const conditions = [];

    // Jika login sebagai admin-food-court, otomatis batasi hanya tenant yang berada di food court miliknya
    if (currentUser?.role === "admin-food-court") {
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, currentUser.id));

      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) {
        return [];
      }

      if (filter?.foodCourtId) {
        if (!courtIds.includes(filter.foodCourtId)) {
          return [];
        }
        conditions.push(eq(tenants.foodCourtId, filter.foodCourtId));
      } else {
        conditions.push(inArray(tenants.foodCourtId, courtIds));
      }
    } else if (filter?.foodCourtId) {
      conditions.push(eq(tenants.foodCourtId, filter.foodCourtId));
    }

    if (typeof filter?.isOpen === "boolean") {
      conditions.push(eq(tenants.isOpen, filter.isOpen));
    }

    const queryOptions = {
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
            status: true,
            role: true,
          },
        },
        foodCourt: true,
      },
    } as const;

    if (conditions.length > 0) {
      return db.query.tenants.findMany({
        where: and(...conditions),
        ...queryOptions,
      });
    }

    return db.query.tenants.findMany(queryOptions);
  }

  async getById(id: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
            status: true,
            role: true,
          },
        },
        foodCourt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant with id '${id}' not found`);
    }

    return tenant;
  }

  async getByOwnerId(ownerId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.ownerId, ownerId),
    });

    if (!tenant) {
      throw new NotFoundError("No tenant stall found for your account");
    }

    const fc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, tenant.foodCourtId),
    });

    return {
      ...tenant,
      foodCourt: fc,
    };
  }

  async create(data: CreateTenantDTOType, currentUser: AuthUser) {
    let foodCourtId = data.foodCourtId;

    if (currentUser.role === "admin-food-court") {
      if (!foodCourtId) {
        const managed = await db.query.foodCourts.findFirst({
          where: eq(foodCourts.managerId, currentUser.id),
        });
        if (!managed) {
          throw new ForbiddenError(
            "You must register a food court before creating tenants",
          );
        }
        foodCourtId = managed.id;
      } else {
        const fc = await db.query.foodCourts.findFirst({
          where: eq(foodCourts.id, foodCourtId),
        });
        if (!fc || fc.managerId !== currentUser.id) {
          throw new ForbiddenError(
            "Forbidden to add tenant to this food court",
          );
        }
      }
    } else {
      foodCourtId =
        foodCourtId ?? (await this.getOrCreateDefaultFoodCourt());
    }

    // 1. Resolve target food court name for emails
    const targetFc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, foodCourtId),
    });

    // 2. Resolve owner and enforce 1-to-1 User = Tenant rule
    let ownerId: string;
    if (data.ownerEmail && data.ownerEmail.trim()) {
      const email = data.ownerEmail.trim().toLowerCase();
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        // Enforce: User cannot already own another tenant
        const alreadyTenant = await db.query.tenants.findFirst({
          where: eq(tenants.ownerId, existingUser.id),
        });
        if (alreadyTenant) {
          throw new ConflictError(
            `Email '${email}' sudah terdaftar sebagai pemilik gerai '${alreadyTenant.name}'. Setiap akun hanya boleh mengelola 1 gerai.`,
          );
        }
        ownerId = existingUser.id;
        if (existingUser.role !== "admin" && existingUser.role !== "admin-food-court") {
          await db
            .update(users)
            .set({ role: "tenant" })
            .where(eq(users.id, existingUser.id));
        }
      } else {
        // Create new user in PENDING_ACTIVATION state
        const newUserId = crypto.randomUUID();
        const activationToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
        const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const placeholderHash = await Bun.password.hash(crypto.randomUUID());
        const ownerDisplayName = (data.ownerName || data.name).trim();

        await db.insert(users).values({
          id: newUserId,
          name: ownerDisplayName,
          email,
          passwordHash: placeholderHash,
          role: "tenant",
          status: "PENDING_ACTIVATION",
          activationToken,
          activationExpires,
        });

        ownerId = newUserId;

        // Send activation email
        await mailerService.sendActivationEmail({
          to: email,
          ownerName: ownerDisplayName,
          tenantName: data.name,
          stallNumber: data.stallNumber,
          foodCourtName: targetFc?.name,
          activationToken,
        });
      }
    } else if (data.ownerId) {
      const alreadyTenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, data.ownerId),
      });
      if (alreadyTenant) {
        throw new ConflictError(
          `User ID '${data.ownerId}' sudah terdaftar sebagai pemilik gerai '${alreadyTenant.name}'. Satu akun hanya boleh mengelola 1 gerai.`,
        );
      }
      ownerId = data.ownerId;
    } else if (currentUser.role === "tenant") {
      const alreadyTenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, currentUser.id),
      });
      if (alreadyTenant) {
        throw new ConflictError(
          `Akun Anda sudah memiliki gerai '${alreadyTenant.name}'. Satu akun hanya boleh mengelola 1 gerai.`,
        );
      }
      ownerId = currentUser.id;
    } else {
      // Admin atau admin-food-court membuat stan tanpa pemilik langsung (ownerId null sampai diundang)
      ownerId = null;
    }

    // 3. Validasi keunikan stall number pada tenant yang aktif di food court yang sama
    const isOpen = data.isOpen ?? false;
    if (isOpen) {
      const activeStall = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(
          and(
            eq(tenants.foodCourtId, foodCourtId),
            eq(tenants.stallNumber, data.stallNumber),
            eq(tenants.isOpen, true),
          ),
        )
        .limit(1);

      if (activeStall.length > 0) {
        throw new ConflictError(
          `Stall number '${data.stallNumber}' is already occupied by active tenant '${activeStall[0].name}' in this food court`,
        );
      }
    }

    // 4. Generate slug otomatis dan pastikan unique per food court
    const baseSlug = generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(
            eq(tenants.foodCourtId, foodCourtId),
            eq(tenants.slug, slug),
          ),
        )
        .limit(1);

      if (existingSlug.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const id = crypto.randomUUID();

    const newTenant = {
      id,
      foodCourtId,
      name: data.name,
      slug,
      description: data.description ?? null,
      stallNumber: data.stallNumber,
      ownerId,
      isOpen,
      logo: data.logo ?? null,
      openingTime: data.openingTime ?? null,
      closingTime: data.closingTime ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(tenants).values(newTenant);
    return this.getById(id);
  }

  async resendActivation(id: string) {
    const tenant = await this.getById(id);
    if (!tenant.ownerId) {
      throw new NotFoundError("Gerai ini belum memiliki akun pemilik");
    }
    const owner = await db.query.users.findFirst({
      where: eq(users.id, tenant.ownerId),
    });
    if (!owner) {
      throw new NotFoundError("Akun pemilik tidak ditemukan");
    }
    if (owner.status === "ACTIVE") {
      throw new ConflictError("Akun pemilik gerai ini sudah aktif");
    }

    const activationToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db
      .update(users)
      .set({
        activationToken,
        activationExpires,
      })
      .where(eq(users.id, owner.id));

    const fc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, tenant.foodCourtId),
    });

    await mailerService.sendActivationEmail({
      to: owner.email,
      ownerName: owner.name,
      tenantName: tenant.name,
      stallNumber: tenant.stallNumber,
      foodCourtName: fc?.name,
      activationToken,
    });

    return {
      message: `Tautan aktivasi berhasil dikirim ulang ke ${owner.email}`,
    };
  }

  async update(id: string, data: UpdateTenantDTOType, currentUser: AuthUser) {
    const existing = await this.getById(id);

    let isManager = false;
    if (currentUser.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.id, existing.foodCourtId),
      });
      isManager = fc?.managerId === currentUser.id;
    }

    if (
      currentUser.role !== "admin" &&
      existing.ownerId !== currentUser.id &&
      !isManager
    ) {
      throw new ForbiddenError(
        "You do not have permission to modify this tenant",
      );
    }

    // 1. Validasi keunikan stall number jika stallNumber atau isOpen diupdate
    const targetStallNumber = data.stallNumber ?? existing.stallNumber;
    const targetIsOpen =
      data.isOpen !== undefined ? data.isOpen : existing.isOpen;

    if (targetIsOpen) {
      const activeStall = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(
          and(
            eq(tenants.foodCourtId, existing.foodCourtId),
            eq(tenants.stallNumber, targetStallNumber),
            eq(tenants.isOpen, true),
            ne(tenants.id, id),
          ),
        )
        .limit(1);

      if (activeStall.length > 0) {
        throw new ConflictError(
          `Stall number '${targetStallNumber}' is already occupied by active tenant '${activeStall[0].name}' in this food court`,
        );
      }
    }

    // 2. Generate slug baru jika nama diubah
    let updatedSlug: string | undefined;
    if (data.name && data.name !== existing.name) {
      const baseSlug = generateSlug(data.name);
      updatedSlug = baseSlug;
      let counter = 1;
      while (true) {
        const existingSlug = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(
            and(
              eq(tenants.foodCourtId, existing.foodCourtId),
              eq(tenants.slug, updatedSlug),
              ne(tenants.id, id),
            ),
          )
          .limit(1);

        if (existingSlug.length === 0) break;
        updatedSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const updateData: Partial<typeof tenants.$inferInsert> = {
      ...data,
      ...(updatedSlug ? { slug: updatedSlug } : {}),
      updatedAt: new Date(),
    };

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    return this.getById(id);
  }

  async delete(id: string, currentUser: AuthUser) {
    const existing = await this.getById(id);

    let isManager = false;
    if (currentUser.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.id, existing.foodCourtId),
      });
      isManager = fc?.managerId === currentUser.id;
    }

    if (
      currentUser.role !== "admin" &&
      existing.ownerId !== currentUser.id &&
      !isManager
    ) {
      throw new ForbiddenError(
        "You do not have permission to delete this tenant",
      );
    }

    await db.delete(tenants).where(eq(tenants.id, id));
    return { success: true, message: `Tenant '${existing.name}' deleted` };
  }

  // ==========================================
  // WALLET & WITHDRAWAL MANAGEMENT
  // ==========================================

  private async getTenantForUser(user: AuthUser, explicitTenantId?: string) {
    if (user.role === "tenant") {
      const owned = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, user.id),
      });
      if (!owned) {
        throw new NotFoundError("No tenant stall found for your account");
      }
      if (explicitTenantId && explicitTenantId !== owned.id) {
        throw new ForbiddenError("You cannot access wallet data for another tenant stall");
      }
      return owned;
    }

    if (user.role === "admin-food-court") {
      if (!explicitTenantId) {
        throw new BadRequestError("tenantId is required for admin-food-court");
      }
      const target = await db.query.tenants.findFirst({
        where: eq(tenants.id, explicitTenantId),
        with: { foodCourt: true },
      });
      if (!target) {
        throw new NotFoundError(`Tenant '${explicitTenantId}' not found`);
      }
      if (target.foodCourt?.managerId !== user.id) {
        throw new ForbiddenError("You do not have permission to manage this tenant's wallet");
      }
      return target;
    }

    if (user.role === "admin") {
      if (!explicitTenantId) {
        throw new BadRequestError("tenantId is required for admin");
      }
      const target = await db.query.tenants.findFirst({
        where: eq(tenants.id, explicitTenantId),
      });
      if (!target) {
        throw new NotFoundError(`Tenant '${explicitTenantId}' not found`);
      }
      return target;
    }

    throw new ForbiddenError("Unauthorized role for wallet operations");
  }

  async getTenantWalletSummary(user: AuthUser, explicitTenantId?: string) {
    const tenant = await this.getTenantForUser(user, explicitTenantId);

    const logs = await db.query.tenantBalanceLogs.findMany({
      where: eq(tenantBalanceLogs.tenantId, tenant.id),
      orderBy: [desc(tenantBalanceLogs.createdAt)],
      limit: 100,
      with: {
        tenantOrder: true,
        withdrawalRequest: true,
      },
    });

    const grossTotal = logs
      .filter((l) => l.type === "ORDER_REVENUE")
      .reduce((acc, l) => acc + (l.grossAmount || 0), 0);

    const feeTotal = logs
      .filter((l) => l.type === "ORDER_REVENUE")
      .reduce((acc, l) => acc + (l.platformFee || 0), 0);

    const disbursedTotal = logs
      .filter((l) => l.type === "WITHDRAWAL_COMPLETED")
      .reduce((acc, l) => acc + Math.abs(l.netAmount || 0), 0);

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      stallNumber: tenant.stallNumber,
      balance: tenant.balance || 0,
      grossTotal,
      feeTotal,
      disbursedTotal,
      bankName: tenant.bankName,
      bankAccountNumber: tenant.bankAccountNumber,
      bankAccountHolder: tenant.bankAccountHolder,
      logs,
    };
  }

  async createWithdrawalRequest(
    user: AuthUser,
    data: RequestWithdrawalDTOType,
    explicitTenantId?: string,
  ) {
    const tenant = await this.getTenantForUser(user, explicitTenantId);

    if (data.amount < 10000) {
      throw new BadRequestError("Nominal penarikan minimal Rp 10.000");
    }

    const currentBalance = tenant.balance || 0;
    if (data.amount > currentBalance) {
      throw new BadRequestError(
        `Saldo tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString("id-ID")}, jumlah ditarik: Rp ${data.amount.toLocaleString("id-ID")}`,
      );
    }

    if (data.paymentMethod === "TRANSFER") {
      if (!data.bankName || !data.bankAccountNumber || !data.bankAccountHolder) {
        throw new BadRequestError(
          "Informasi rekening (bankName, bankAccountNumber, bankAccountHolder) wajib diisi untuk metode transfer",
        );
      }
    }

    const newBalance = currentBalance - data.amount;
    const withdrawalId = crypto.randomUUID();

    // Update tenant balance and default bank info
    await db
      .update(tenants)
      .set({
        balance: newBalance,
        ...(data.bankName ? { bankName: data.bankName } : {}),
        ...(data.bankAccountNumber ? { bankAccountNumber: data.bankAccountNumber } : {}),
        ...(data.bankAccountHolder ? { bankAccountHolder: data.bankAccountHolder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenant.id));

    // Create withdrawal request record
    await db.insert(withdrawalRequests).values({
      id: withdrawalId,
      foodCourtId: tenant.foodCourtId,
      tenantId: tenant.id,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      bankName: data.bankName ?? tenant.bankName,
      bankAccountNumber: data.bankAccountNumber ?? tenant.bankAccountNumber,
      bankAccountHolder: data.bankAccountHolder ?? tenant.bankAccountHolder,
      status: "PENDING",
      requestedAt: new Date(),
    });

    // Create ledger hold log
    await db.insert(tenantBalanceLogs).values({
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      withdrawalRequestId: withdrawalId,
      type: "WITHDRAWAL_HOLD",
      grossAmount: 0,
      platformFee: 0,
      netAmount: -data.amount,
      balanceAfter: newBalance,
      description: `Pengajuan penarikan dana (${data.paymentMethod === "CASH" ? "Tunai" : `Transfer ${data.bankName}`}) - Saldo ditahan`,
      createdAt: new Date(),
    });

    return db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, withdrawalId),
      with: {
        tenant: true,
      },
    });
  }

  async getTenantWithdrawals(user: AuthUser, explicitTenantId?: string) {
    const tenant = await this.getTenantForUser(user, explicitTenantId);

    return db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.tenantId, tenant.id),
      orderBy: [desc(withdrawalRequests.requestedAt)],
      with: {
        processor: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async confirmWithdrawalReceipt(user: AuthUser, withdrawalId: string) {
    const wr = await db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, withdrawalId),
      with: {
        tenant: true,
      },
    });

    if (!wr) {
      throw new NotFoundError(`Withdrawal request '${withdrawalId}' not found`);
    }

    if (user.role === "tenant" && wr.tenant.ownerId !== user.id) {
      throw new ForbiddenError("You can only confirm withdrawal for your own tenant stall");
    }

    if (wr.status !== "PROCESSED") {
      throw new BadRequestError(
        `Cannot confirm receipt for withdrawal with status '${wr.status}'. Status must be 'PROCESSED'.`,
      );
    }

    await db
      .update(withdrawalRequests)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, wr.id));

    await db.insert(tenantBalanceLogs).values({
      id: crypto.randomUUID(),
      tenantId: wr.tenantId,
      withdrawalRequestId: wr.id,
      type: "WITHDRAWAL_COMPLETED",
      grossAmount: 0,
      platformFee: 0,
      netAmount: 0,
      balanceAfter: wr.tenant.balance || 0,
      description: `Pencairan dana ${wr.paymentMethod === "CASH" ? "Tunai" : "Transfer"} Rp ${wr.amount.toLocaleString("id-ID")} telah dikonfirmasi diterima`,
      createdAt: new Date(),
    });

    return db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, wr.id),
      with: {
        tenant: true,
        processor: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // ==========================================
  // ADMIN FOOD COURT WITHDRAWAL MANAGEMENT
  // ==========================================

  async listAdminWithdrawals(user: AuthUser, statusFilter?: string) {
    const conditions = [];

    if (user.role === "admin-food-court") {
      const managedCourts = await db
        .select({ id: foodCourts.id })
        .from(foodCourts)
        .where(eq(foodCourts.managerId, user.id));

      const courtIds = managedCourts.map((c) => c.id);
      if (courtIds.length === 0) {
        return [];
      }
      conditions.push(inArray(withdrawalRequests.foodCourtId, courtIds));
    }

    if (statusFilter && ["PENDING", "PROCESSED", "COMPLETED", "REJECTED"].includes(statusFilter)) {
      conditions.push(eq(withdrawalRequests.status, statusFilter as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.withdrawalRequests.findMany({
      where: whereClause,
      orderBy: [desc(withdrawalRequests.requestedAt)],
      with: {
        tenant: true,
        foodCourt: true,
        processor: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async processAdminWithdrawal(
    user: AuthUser,
    withdrawalId: string,
    data: ProcessWithdrawalDTOType,
  ) {
    const wr = await db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, withdrawalId),
      with: {
        tenant: true,
        foodCourt: true,
      },
    });

    if (!wr) {
      throw new NotFoundError(`Withdrawal request '${withdrawalId}' not found`);
    }

    if (user.role === "admin-food-court" && wr.foodCourt.managerId !== user.id) {
      throw new ForbiddenError("You do not have permission to process withdrawals for this food court");
    }

    if (wr.status !== "PENDING") {
      throw new BadRequestError(`Cannot process withdrawal with status '${wr.status}'. Only PENDING can be processed.`);
    }

    const paymentMethod = data.paymentMethod ?? wr.paymentMethod;

    await db
      .update(withdrawalRequests)
      .set({
        status: "PROCESSED",
        paymentMethod,
        proofReceiptUrl: data.proofReceiptUrl ?? wr.proofReceiptUrl,
        transferReference: data.transferReference ?? wr.transferReference,
        adminNotes: data.adminNotes ?? wr.adminNotes,
        processedBy: user.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, wr.id));

    return db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, wr.id),
      with: {
        tenant: true,
        foodCourt: true,
        processor: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async rejectAdminWithdrawal(
    user: AuthUser,
    withdrawalId: string,
    reason: string,
  ) {
    const wr = await db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, withdrawalId),
      with: {
        tenant: true,
        foodCourt: true,
      },
    });

    if (!wr) {
      throw new NotFoundError(`Withdrawal request '${withdrawalId}' not found`);
    }

    if (user.role === "admin-food-court" && wr.foodCourt.managerId !== user.id) {
      throw new ForbiddenError("You do not have permission to reject withdrawals for this food court");
    }

    if (wr.status !== "PENDING") {
      throw new BadRequestError(`Cannot reject withdrawal with status '${wr.status}'. Only PENDING can be rejected.`);
    }

    // Refund tenant balance
    const currentBalance = wr.tenant.balance || 0;
    const restoredBalance = currentBalance + wr.amount;

    await db
      .update(tenants)
      .set({
        balance: restoredBalance,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, wr.tenantId));

    // Insert refund log
    await db.insert(tenantBalanceLogs).values({
      id: crypto.randomUUID(),
      tenantId: wr.tenantId,
      withdrawalRequestId: wr.id,
      type: "WITHDRAWAL_REFUND",
      grossAmount: 0,
      platformFee: 0,
      netAmount: wr.amount,
      balanceAfter: restoredBalance,
      description: `Pengajuan penarikan ditolak: ${reason} (Saldo Rp ${wr.amount.toLocaleString("id-ID")} dikembalikan)`,
      createdAt: new Date(),
    });

    // Update status to REJECTED
    await db
      .update(withdrawalRequests)
      .set({
        status: "REJECTED",
        adminNotes: reason,
        processedBy: user.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, wr.id));

    return db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, wr.id),
      with: {
        tenant: true,
        foodCourt: true,
      },
    });
  }

  async completeAdminWithdrawal(user: AuthUser, withdrawalId: string) {
    const wr = await db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, withdrawalId),
      with: {
        tenant: true,
        foodCourt: true,
      },
    });

    if (!wr) {
      throw new NotFoundError(`Withdrawal request '${withdrawalId}' not found`);
    }

    if (user.role === "admin-food-court" && wr.foodCourt.managerId !== user.id) {
      throw new ForbiddenError("You do not have permission to complete withdrawals for this food court");
    }

    if (wr.status !== "PENDING" && wr.status !== "PROCESSED") {
      throw new BadRequestError(`Cannot complete withdrawal with status '${wr.status}'`);
    }

    await db
      .update(withdrawalRequests)
      .set({
        status: "COMPLETED",
        processedBy: user.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, wr.id));

    await db.insert(tenantBalanceLogs).values({
      id: crypto.randomUUID(),
      tenantId: wr.tenantId,
      withdrawalRequestId: wr.id,
      type: "WITHDRAWAL_COMPLETED",
      grossAmount: 0,
      platformFee: 0,
      netAmount: 0,
      balanceAfter: wr.tenant.balance || 0,
      description: `Pencairan dana ${wr.paymentMethod === "CASH" ? "Tunai Langsung" : "Transfer"} Rp ${wr.amount.toLocaleString("id-ID")} selesai`,
      createdAt: new Date(),
    });

    return db.query.withdrawalRequests.findFirst({
      where: eq(withdrawalRequests.id, wr.id),
      with: {
        tenant: true,
        foodCourt: true,
        processor: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}

export const tenantService = new TenantService();
