import { and, desc, eq, like, or } from "drizzle-orm";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import type { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import { foodCourts, tenants } from "../../db/schema";
import type {
  CreateFoodCourtDTOType,
  FoodCourtsQueryDTOType,
  UpdateFoodCourtDTOType,
} from "./model";

export function generateSlug(text: string): string {
  const cleaned = text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Hilangkan aksen unicode
    .replace(/[^a-z0-9\s-]/g, "") // Hapus karakter khusus
    .replace(/[\s_]+/g, "-") // Ganti spasi & underscore menjadi -
    .replace(/-+/g, "-") // Gabungkan tanda - berulang
    .replace(/^-+|-+$/g, ""); // Hapus tanda - di awal dan akhir

  return cleaned || "food-court";
}

export class FoodCourtService {
  async create(data: CreateFoodCourtDTOType, managerId: string) {
    const slug = generateSlug(data.name);

    const existing = await db
      .select()
      .from(foodCourts)
      .where(eq(foodCourts.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError("Food court with this slug already exists");
    }

    const id = crypto.randomUUID();
    await db.insert(foodCourts).values({
      id,
      managerId,
      name: data.name,
      slug,
      address: data.address || null,
      phone: data.phone || null,
      logo: data.logo || null,
      status: "ACTIVE",
    });

    return this.getById(id);
  }

  async getAll(query: FoodCourtsQueryDTOType, user: { id: string; role: string }) {
    const conditions = [];

    // Jika admin-food-court, otomatis filter hanya food court miliknya
    if (user.role === "admin-food-court") {
      conditions.push(eq(foodCourts.managerId, user.id));
    }

    if (query.status) {
      conditions.push(eq(foodCourts.status, query.status as "ACTIVE" | "INACTIVE"));
    }

    if (query.search) {
      conditions.push(like(foodCourts.name, `%${query.search}%`));
    }

    return db.query.foodCourts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tenants: true,
        tables: true,
      },
      orderBy: [desc(foodCourts.createdAt)],
    });
  }

  async getById(id: string, user?: { id: string; role: string }) {
    const fc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, id),
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tenants: true,
        tables: true,
      },
    });

    if (!fc) {
      throw new NotFoundError("Food court not found");
    }

    if (user && user.role === "admin-food-court" && fc.managerId !== user.id) {
      throw new ForbiddenError("Forbidden to access this food court");
    }

    return fc;
  }

  async update(id: string, data: UpdateFoodCourtDTOType, user: { id: string; role: string }) {
    const existing = await db
      .select()
      .from(foodCourts)
      .where(eq(foodCourts.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("Food court not found");
    }

    // Hanya admin atau manajer pemilik yang boleh update
    if (user.role === "admin-food-court" && existing[0].managerId !== user.id) {
      throw new ForbiddenError("Forbidden to update this food court");
    }

    const updatePayload: Record<string, any> = { ...data };
    if (data.name) {
      updatePayload.slug = generateSlug(data.name);
    }

    await db.update(foodCourts).set(updatePayload).where(eq(foodCourts.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    const existing = await db
      .select()
      .from(foodCourts)
      .where(eq(foodCourts.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("Food court not found");
    }

    await db.delete(foodCourts).where(eq(foodCourts.id, id));
    return { success: true, message: "Food court deleted successfully" };
  }

  async getTenantsByFoodCourt(
    foodCourtIdOrSlug: string,
    filter?: { isOpen?: boolean; search?: string },
    user?: AuthUser | null,
  ) {
    const fc = await db.query.foodCourts.findFirst({
      where: or(
        eq(foodCourts.id, foodCourtIdOrSlug),
        eq(foodCourts.slug, foodCourtIdOrSlug),
      ),
    });

    if (!fc) {
      throw new NotFoundError(`Food court '${foodCourtIdOrSlug}' not found`);
    }

    if (user && user.role === "admin-food-court" && fc.managerId !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to view tenants for this food court",
      );
    }

    const conditions = [eq(tenants.foodCourtId, fc.id)];

    if (typeof filter?.isOpen === "boolean") {
      conditions.push(eq(tenants.isOpen, filter.isOpen));
    }

    if (filter?.search) {
      conditions.push(like(tenants.name, `%${filter.search}%`));
    }

    return db.query.tenants.findMany({
      where: and(...conditions),
    });
  }
}

export const foodCourtService = new FoodCourtService();
