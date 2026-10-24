import { eq } from "drizzle-orm";
import { BadRequestError, ConflictError, UnauthorizedError } from "../../common/errors";
import { db } from "../../db";
import { tenants, users } from "../../db/schema";
import type { LoginDTOType, RegisterDTOType } from "./model";

export class AuthService {
  async register(data: RegisterDTOType) {
    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existing) {
      throw new ConflictError("Email is already registered");
    }

    const passwordHash = await Bun.password.hash(data.password, {
      algorithm: "argon2id",
    });

    const id = crypto.randomUUID();
    const newUser = {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role || "customer",
    };

    await db.insert(users).values(newUser);

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async login(data: LoginDTOType) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status === "PENDING_ACTIVATION") {
      throw new UnauthorizedError(
        "Akun Anda belum diaktifkan. Silakan periksa email Anda untuk mengaktifkan akun dan membuat kata sandi."
      );
    }

    const isValid = await Bun.password.verify(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async verifyActivationToken(token: string) {
    if (!token) {
      throw new BadRequestError("Token aktivasi tidak boleh kosong");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.activationToken, token),
    });

    if (!user) {
      throw new BadRequestError("Tautan aktivasi tidak valid atau telah digunakan.");
    }

    if (user.activationExpires && new Date(user.activationExpires).getTime() < Date.now()) {
      throw new BadRequestError(
        "Tautan aktivasi telah kedaluwarsa (lebih dari 7 hari). Silakan hubungi admin untuk mengirim ulang tautan aktivasi."
      );
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.ownerId, user.id),
      with: {
        foodCourt: true,
      },
    });

    return {
      valid: true,
      data: {
        email: user.email,
        name: user.name,
        tenantName: tenant?.name || "Gerai Kuliner",
        stallNumber: tenant?.stallNumber || "-",
        foodCourtName: tenant?.foodCourt?.name || "Sentra Food Court",
      },
    };
  }

  async activateAccount(token: string, password: string) {
    if (!token) {
      throw new BadRequestError("Token aktivasi tidak boleh kosong");
    }
    if (!password || password.length < 6) {
      throw new BadRequestError("Kata sandi minimal 6 karakter");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.activationToken, token),
    });

    if (!user) {
      throw new BadRequestError("Tautan aktivasi tidak valid atau telah digunakan.");
    }

    if (user.activationExpires && new Date(user.activationExpires).getTime() < Date.now()) {
      throw new BadRequestError(
        "Tautan aktivasi telah kedaluwarsa (lebih dari 7 hari). Silakan hubungi admin untuk mengirim ulang tautan aktivasi."
      );
    }

    const passwordHash = await Bun.password.hash(password, {
      algorithm: "argon2id",
    });

    await db
      .update(users)
      .set({
        passwordHash,
        status: "ACTIVE",
        activationToken: null,
        activationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async getUserById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
