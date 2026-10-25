import { Elysia, t } from "elysia";
import {
  authPlugin,
  requireRoles,
} from "../../common/middlewares/auth";
import {
  CreateDiscountDTO,
  GetDiscountsQueryDTO,
  PublicDiscountsQueryDTO,
  UpdateDiscountDTO,
  ValidateDiscountDTO,
} from "./model";
import { discountService } from "./service";

export const discountsController = new Elysia({ prefix: "/api/discounts" })
  .use(authPlugin)
  // 1. Public list of active vouchers for checkout
  .get(
    "/public",
    async ({ query }) => {
      const data = await discountService.getPublicDiscounts(
        query.foodCourtId,
        query.tenantId,
      );
      return { data };
    },
    {
      query: PublicDiscountsQueryDTO,
      detail: {
        tags: ["Discounts"],
        summary: "Get active public vouchers for a food court or tenant",
      },
    },
  )
  // 2. Pre-checkout discount validation and savings preview
  .post(
    "/validate",
    async ({ body }) => {
      const data = await discountService.validateDiscount(body);
      return {
        message: "Voucher valid",
        data,
      };
    },
    {
      body: ValidateDiscountDTO,
      detail: {
        tags: ["Discounts"],
        summary: "Validate discount code or ID against cart items",
      },
    },
  )
  // 3. Create discount (admin, admin-food-court, tenant)
  .post(
    "/",
    async ({ body, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await discountService.createDiscount(body, user);
      return {
        message: "Promo diskon berhasil dibuat",
        data,
      };
    },
    {
      body: CreateDiscountDTO,
      detail: {
        tags: ["Discounts"],
        summary: "Create a new discount (Admin, Admin Food Court, Tenant)",
      },
    },
  )
  // 4. List all discounts for management
  .get(
    "/",
    async ({ query, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await discountService.getDiscounts(query, user);
      return { data };
    },
    {
      query: GetDiscountsQueryDTO,
      detail: {
        tags: ["Discounts"],
        summary: "List all discounts with filters for management",
      },
    },
  )
  // 5. Get discount detail by ID
  .get(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await discountService.getDiscountById(id);
      return { data };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Discounts"],
        summary: "Get discount details by ID",
      },
    },
  )
  // 6. Update discount
  .put(
    "/:id",
    async ({ params: { id }, body, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await discountService.updateDiscount(id, body, user);
      return {
        message: "Promo diskon berhasil diperbarui",
        data,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateDiscountDTO,
      detail: {
        tags: ["Discounts"],
        summary: "Update discount details",
      },
    },
  )
  // 7. Deactivate discount
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      requireRoles(user, ["admin", "admin-food-court", "tenant"]);
      const data = await discountService.deleteDiscount(id, user);
      return data;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Discounts"],
        summary: "Deactivate discount",
      },
    },
  );
