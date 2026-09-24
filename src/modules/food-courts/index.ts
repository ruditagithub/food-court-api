import { Elysia, t } from "elysia";
import { authPlugin, requireRoles } from "../../common/middlewares/auth";
import {
  CreateFoodCourtDTO,
  FoodCourtsQueryDTO,
  UpdateFoodCourtDTO,
} from "./model";
import { foodCourtService } from "./service";

export const foodCourtsController = new Elysia({ prefix: "/api/food-courts" })
  .use(authPlugin)
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const created = await foodCourtService.create(body, user.id);
      set.status = 201;
      return {
        message: "Food court registered successfully",
        data: created,
      };
    },
    {
      body: CreateFoodCourtDTO,
      detail: {
        tags: ["Food Courts"],
        summary: "Register a new food court (Admin or Admin Food Court)",
      },
    },
  )
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await foodCourtService.getAll(query, user);
      return {
        data,
      };
    },
    {
      query: FoodCourtsQueryDTO,
      detail: {
        tags: ["Food Courts"],
        summary:
          "Get list of food courts (Admin sees all, Admin Food Court sees own)",
      },
    },
  )
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await foodCourtService.getById(id, user);
      return {
        data,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Food Courts"],
        summary:
          "Get food court detail with tenants and tables (Admin or owning Admin Food Court)",
      },
    },
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const updated = await foodCourtService.update(id, body, user);
      return {
        message: "Food court updated successfully",
        data: updated,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: UpdateFoodCourtDTO,
      detail: {
        tags: ["Food Courts"],
        summary:
          "Update food court profile (Admin or owning Manager)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin"]);
      return foodCourtService.delete(id);
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Food Courts"],
        summary: "Delete food court (Admin only)",
      },
    },
  );
