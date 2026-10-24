import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "../../common/middlewares/auth";
import { LoginDTO, RegisterDTO } from "./model";
import { authService } from "./service";

export const authController = new Elysia({ prefix: "/api/auth" })
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, set }) => {
      const user = await authService.register(body);
      set.status = 201;
      return {
        message: "User registered successfully",
        data: user,
      };
    },
    {
      body: RegisterDTO,
      detail: {
        tags: ["Auth"],
        summary: "Register a new user (admin, tenant, or customer)",
      },
    },
  )
  .post(
    "/login",
    async ({ body, jwt }) => {
      const user = await authService.login(body);
      const token = await jwt.sign({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      return {
        message: "Login successful",
        data: {
          token,
          user,
        },
      };
    },
    {
      body: LoginDTO,
      detail: {
        tags: ["Auth"],
        summary: "Authenticate user and get JWT token",
      },
    },
  )
  .get(
    "/verify-activation-token",
    async ({ query: { token } }) => {
      const result = await authService.verifyActivationToken(token);
      return result;
    },
    {
      query: t.Object({
        token: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Verify tenant account activation token",
      },
    },
  )
  .post(
    "/activate-account",
    async ({ body, jwt }) => {
      const user = await authService.activateAccount(body.token, body.password);
      const token = await jwt.sign({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      return {
        message: "Akun berhasil diaktifkan",
        data: {
          token,
          user,
        },
      };
    },
    {
      body: t.Object({
        token: t.String(),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Activate tenant account by setting password",
      },
    },
  )
  .get(
    "/me",
    async ({ user }) => {
      requireAuth(user);
      const profile = await authService.getUserById(user.id);
      return {
        data: profile,
      };
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile",
      },
    },
  );
