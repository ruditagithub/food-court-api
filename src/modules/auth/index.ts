import { Elysia } from "elysia";
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
