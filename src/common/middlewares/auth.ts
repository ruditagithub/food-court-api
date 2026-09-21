import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { env } from "../../config/env";
import { ForbiddenError, UnauthorizedError } from "../errors";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "tenant" | "customer";
}

export const jwtPlugin = new Elysia({ name: "jwtPlugin" }).use(
  jwt({
    name: "jwt",
    secret: env.JWT_SECRET,
    exp: "7d",
  }),
);

export const authPlugin = new Elysia({ name: "authPlugin" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    const auth = headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return { user: null as AuthUser | null };
    }

    const token = auth.slice(7);
    const payload = await jwt.verify(token);
    if (!payload) {
      return { user: null as AuthUser | null };
    }

    return {
      user: {
        id: String(payload.id),
        name: String(payload.name ?? ""),
        email: String(payload.email),
        role: payload.role as AuthUser["role"],
      },
    };
  });

export function requireAuth(user: AuthUser | null): asserts user is AuthUser {
  if (!user) {
    throw new UnauthorizedError("Authentication required. Please login.");
  }
}

export function requireRoles(
  user: AuthUser | null,
  roles: Array<"admin" | "tenant" | "customer">,
): asserts user is AuthUser {
  requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied. Requires one of roles: ${roles.join(", ")}`,
    );
  }
}
