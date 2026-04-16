import { describe, it, expect } from "vitest";
import {
  events,
  users,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
  eventCocktails,
  eventContacts,
  eventChecklists,
} from "./schema";

describe("Database Schema", () => {
  describe("users table", () => {
    it("has required columns", () => {
      const columns = Object.keys(users);
      expect(columns).toContain("id");
      expect(columns).toContain("email");
      expect(columns).toContain("name");
      expect(columns).toContain("role");
    });
  });

  describe("events table", () => {
    it("has core event columns", () => {
      const columns = Object.keys(events);
      expect(columns).toContain("id");
      expect(columns).toContain("eventName");
      expect(columns).toContain("eventDate");
      expect(columns).toContain("venueName");
      expect(columns).toContain("guestCount");
      expect(columns).toContain("status");
    });

    it("has financial columns", () => {
      const columns = Object.keys(events);
      expect(columns).toContain("invoiceAmount");
      expect(columns).toContain("costAmount");
    });

    it("has LC communication columns", () => {
      const columns = Object.keys(events);
      expect(columns).toContain("lcSentAt");
      expect(columns).toContain("lcRecipient");
    });

    it("has logistics columns", () => {
      const columns = Object.keys(events);
      expect(columns).toContain("installInstructions");
      expect(columns).toContain("parkingInstructions");
      expect(columns).toContain("stationLayoutNotes");
    });
  });

  describe("cocktails table", () => {
    it("has required columns", () => {
      const columns = Object.keys(cocktails);
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("defaultMenuName");
      expect(columns).toContain("season");
      expect(columns).toContain("glassType");
      expect(columns).toContain("referenceImageUrl");
      expect(columns).toContain("isNonAlcoholic");
    });
  });

  describe("cocktailIngredients table", () => {
    it("has required columns", () => {
      const columns = Object.keys(cocktailIngredients);
      expect(columns).toContain("cocktailId");
      expect(columns).toContain("ingredientName");
      expect(columns).toContain("ingredientCategory");
      expect(columns).toContain("amount");
      expect(columns).toContain("unit");
      expect(columns).toContain("brand");
    });
  });

  describe("cocktailGarnishes table", () => {
    it("has required columns", () => {
      const columns = Object.keys(cocktailGarnishes);
      expect(columns).toContain("cocktailId");
      expect(columns).toContain("garnishName");
      expect(columns).toContain("garnishCategory");
      expect(columns).toContain("quantity");
    });
  });

  describe("eventCocktails junction table", () => {
    it("has required columns", () => {
      const columns = Object.keys(eventCocktails);
      expect(columns).toContain("eventId");
      expect(columns).toContain("cocktailId");
      expect(columns).toContain("menuName");
      expect(columns).toContain("servesAllocated");
      expect(columns).toContain("stationNumber");
    });
  });

  describe("eventContacts table", () => {
    it("has required columns", () => {
      const columns = Object.keys(eventContacts);
      expect(columns).toContain("eventId");
      expect(columns).toContain("contactName");
      expect(columns).toContain("contactRole");
      expect(columns).toContain("contactPhone");
      expect(columns).toContain("isPrimary");
    });
  });

  describe("eventChecklists table", () => {
    it("exports eventChecklists table", () => {
      expect(eventChecklists).toBeDefined();
      expect(eventChecklists.id).toBeDefined();
      expect(eventChecklists.eventId).toBeDefined();
      expect(eventChecklists.label).toBeDefined();
      expect(eventChecklists.isCompleted).toBeDefined();
      expect(eventChecklists.isCustom).toBeDefined();
    });
  });
});
