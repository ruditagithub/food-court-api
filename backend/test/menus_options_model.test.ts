import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
  CreateMenuDTO,
  UpdateMenuDTO,
  MenuOptionItemDTO,
  CreateMenuOptionDTO,
  UpdateMenuOptionDTO,
} from "../modules/menus/model";

describe("Menu Options DTO Validation", () => {
  it("should validate menu option item schema", () => {
    const validOption = { name: "Level 1 (Sedang)", priceAdjustment: 0 };
    expect(Value.Check(MenuOptionItemDTO, validOption)).toBe(true);

    const validWithId = { id: "opt-1", name: "Level 2", priceAdjustment: 2000 };
    expect(Value.Check(MenuOptionItemDTO, validWithId)).toBe(true);

    const validWithoutPrice = { name: "Original" };
    expect(Value.Check(MenuOptionItemDTO, validWithoutPrice)).toBe(true);

    const invalidEmptyName = { name: "" };
    expect(Value.Check(MenuOptionItemDTO, invalidEmptyName)).toBe(false);

    const invalidMissingName = { priceAdjustment: 500 };
    expect(Value.Check(MenuOptionItemDTO, invalidMissingName)).toBe(false);
  });

  it("should accept options array in CreateMenuDTO", () => {
    const menuWithOpts = {
      tenantId: "tenant-123",
      name: "Ayam Geprek",
      price: 20000,
      options: [
        { name: "Level 1", priceAdjustment: 0 },
        { name: "Level 2", priceAdjustment: 2000 },
      ],
    };
    expect(Value.Check(CreateMenuDTO, menuWithOpts)).toBe(true);

    const menuWithoutOpts = {
      tenantId: "tenant-123",
      name: "Ayam Geprek",
      price: 20000,
    };
    expect(Value.Check(CreateMenuDTO, menuWithoutOpts)).toBe(true);

    const menuWithInvalidOpts = {
      tenantId: "tenant-123",
      name: "Ayam Geprek",
      price: 20000,
      options: [{ name: "" }],
    };
    expect(Value.Check(CreateMenuDTO, menuWithInvalidOpts)).toBe(false);
  });

  it("should accept options array in UpdateMenuDTO", () => {
    const updateWithOpts = {
      name: "Ayam Geprek Spesial",
      options: [
        { id: "opt-1", name: "Level 1", priceAdjustment: 0 },
        { name: "Level 3", priceAdjustment: 3000 },
      ],
    };
    expect(Value.Check(UpdateMenuDTO, updateWithOpts)).toBe(true);

    const updateWithoutOpts = {
      price: 25000,
    };
    expect(Value.Check(UpdateMenuDTO, updateWithoutOpts)).toBe(true);
  });

  it("should validate CreateMenuOptionDTO and UpdateMenuOptionDTO", () => {
    expect(Value.Check(CreateMenuOptionDTO, { name: "Extra Sambal", priceAdjustment: 2000 })).toBe(true);
    expect(Value.Check(CreateMenuOptionDTO, { name: "Extra Sambal" })).toBe(true);
    expect(Value.Check(CreateMenuOptionDTO, { name: "" })).toBe(false);

    expect(Value.Check(UpdateMenuOptionDTO, { name: "Extra Sambal Pedas" })).toBe(true);
    expect(Value.Check(UpdateMenuOptionDTO, { priceAdjustment: 2500 })).toBe(true);
    expect(Value.Check(UpdateMenuOptionDTO, { name: "", priceAdjustment: 2500 })).toBe(false);
  });
});
