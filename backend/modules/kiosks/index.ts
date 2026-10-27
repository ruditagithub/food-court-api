import { Elysia, t } from "elysia";
import { authPlugin, requireRoles } from "../../common/middlewares/auth";
import { CreateKioskDTO, KioskQueryDTO, UpdateKioskDTO } from "./model";
import { kioskService } from "./service";

export const kiosksController = new Elysia({ prefix: "/api/kiosks" })
  .use(authPlugin)
  .get(
    "/resolve/:deviceCode",
    async ({ params: { deviceCode } }) => {
      const data = await kioskService.resolveKioskByDeviceCode(deviceCode);
      return { data };
    },
    {
      params: t.Object({
        deviceCode: t.String(),
      }),
      detail: {
        tags: ["Kiosks"],
        summary: "Resolve kiosk terminal data and catalog by device code (Public)",
      },
    }
  )
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await kioskService.getAll(
        { status: query.status, foodCourtId: query.foodCourtId },
        user
      );
      return { data };
    },
    {
      query: KioskQueryDTO,
      detail: {
        tags: ["Kiosks"],
        summary: "List all kiosks for managed food court (Admin & Admin Food Court)",
      },
    }
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await kioskService.create(body, user);
      set.status = 201;
      return {
        data,
        message: "Perangkat Kiosk berhasil didaftarkan",
      };
    },
    {
      body: CreateKioskDTO,
      detail: {
        tags: ["Kiosks"],
        summary: "Create a new Kiosk terminal",
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await kioskService.getById(id, user);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Kiosks"],
        summary: "Get Kiosk details by ID",
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await kioskService.update(id, body, user);
      return {
        data,
        message: "Perangkat Kiosk berhasil diperbarui",
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateKioskDTO,
      detail: {
        tags: ["Kiosks"],
        summary: "Update Kiosk details or toggle status",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const result = await kioskService.delete(id, user);
      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Kiosks"],
        summary: "Delete a Kiosk device",
      },
    }
  )
  .get(
    "/:id/stats",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court"]);
      const data = await kioskService.getStats(id, user);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Kiosks"],
        summary: "Get Kiosk takeaway ordering statistics",
      },
    }
  );
