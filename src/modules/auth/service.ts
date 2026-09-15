import { eq } from "drizzle-orm";
import { ConflictError, UnauthorizedError } from "../../common/errors";
import { db } from "../../db";
import { users } from "../../db/schema";
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

    const isValid = await Bun.password.verify(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
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
