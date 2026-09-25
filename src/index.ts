import { cors } from "@elysiajs/cors";
import { openapi } from "@elysia/openapi";
import { Elysia, t } from "elysia";
import { AppError } from "./common/errors";
import { authPlugin, requireRoles } from "./common/middlewares/auth";
import { env } from "./config/env";
import { authController } from "./modules/auth";
import { menusController } from "./modules/menus";
import { ordersController } from "./modules/orders";
import { paymentsController } from "./modules/payments";
import { tablesController } from "./modules/tables";
import { tenantsController } from "./modules/tenants";
import { foodCourtsController } from "./modules/food-courts";
import { foodCourtService } from "./modules/food-courts/service";

export const app = new Elysia()
  .use(cors())
  .use(
    openapi({
      path: "/swagger",
      documentation: {
        info: {
          title: "Food Court API",
          version: "1.0.0",
          description:
            "High-performance REST API for Food Court operations built with ElysiaJS, Bun, and Drizzle ORM.",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description:
                "Enter JWT token (obtained from POST /api/auth/login)",
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
        tags: [
          {
            name: "General",
            description: "General and health-check endpoints",
          },
          { name: "Auth", description: "Authentication and user profiles" },
          { name: "Tenants", description: "Food stall / tenant management" },
          { name: "Menus", description: "Food & drink menus and categories" },
          { name: "Tables", description: "Food court dining table management" },
          { name: "Orders", description: "Multi-tenant food ordering" },
          { name: "Payments", description: "Payment processing and invoices" },
          {
            name: "Food Courts",
            description: "Food court location and management",
          },
        ],
      },
    }),
  )
  .onError(({ error, code, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: error.name,
        message: error.message,
      };
    }

    if (code === "VALIDATION") {
      set.status = 422;
      return {
        success: false,
        error: "ValidationError",
        message: error.message,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: "NotFoundError",
        message: "Endpoint not found",
      };
    }

    console.error("[Unhandled Error]:", error);
    set.status = 500;
    return {
      success: false,
      error: "InternalServerError",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : error.message,
    };
  })
  .get(
    "/",
    () => ({
      name: "Food Court API",
      status: "online",
      version: "1.0.0",
      documentation: "/swagger",
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        tags: ["General"],
        summary: "API health status and metadata",
      },
    },
  )
  // Mount feature controllers
  .use(authController)
  .use(tenantsController)
  .use(menusController)
  .use(tablesController)
  .use(ordersController)
  .use(paymentsController)
  .use(foodCourtsController)
  .use(
    new Elysia({ prefix: "/api/food-court" })
      .use(authPlugin)
      .get(
        "/:id/tenant",
        async ({ params: { id }, query, user }) => {
          requireRoles(user, ["admin", "admin-food-court"]);
          const isOpen =
            query.isOpen === "true"
              ? true
              : query.isOpen === "false"
                ? false
                : undefined;
          const data = await foodCourtService.getTenantsByFoodCourt(
            id,
            { isOpen, search: query.search as string | undefined },
            user,
          );
          return { data };
        },
        {
          params: t.Object({ id: t.String() }),
          query: t.Object({
            isOpen: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
          detail: {
            tags: ["Tenants"],
            summary: "Get all tenants for a food court (Admin and Admin Food Court only)",
          },
        },
      )
      .get(
        "/:id/tenants",
        async ({ params: { id }, query, user }) => {
          requireRoles(user, ["admin", "admin-food-court"]);
          const isOpen =
            query.isOpen === "true"
              ? true
              : query.isOpen === "false"
                ? false
                : undefined;
          const data = await foodCourtService.getTenantsByFoodCourt(
            id,
            { isOpen, search: query.search as string | undefined },
            user,
          );
          return { data };
        },
        {
          params: t.Object({ id: t.String() }),
          query: t.Object({
            isOpen: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
          detail: {
            hide: true,
          },
        },
      ),
  );

if (process.env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(
      `🦊 Food Court API is running at http://${app.server?.hostname}:${app.server?.port}`,
    );
    console.log(
      `📖 Swagger documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`,
    );
  });
}

export type App = typeof app;
