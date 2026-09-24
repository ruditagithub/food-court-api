import { t } from "elysia";

export const RegisterDTO = t.Object({
  name: t.String({
    minLength: 2,
    maxLength: 100,
    default: "Admin Food Court",
  }),
  email: t.String({ format: "email", default: "admin@foodcourt.com" }),
  password: t.String({ minLength: 6, default: "password123" }),
  role: t.Optional(
    t.Union(
      [
        t.Literal("admin"),
        t.Literal("admin-food-court"),
        t.Literal("tenant"),
        t.Literal("customer"),
      ],
      {
        default: "admin",
      },
    ),
  ),
});

export const LoginDTO = t.Object({
  email: t.String({ format: "email", default: "admin@foodcourt.com" }),
  password: t.String({ minLength: 1, default: "password123" }),
});

export const UserResponse = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  role: t.String(),
  createdAt: t.Any(),
});

export const AuthResponse = t.Object({
  token: t.String(),
  user: UserResponse,
});

export type RegisterDTOType = typeof RegisterDTO.static;
export type LoginDTOType = typeof LoginDTO.static;
