import {
  pgTable,
  uuid,
  text,
  date,
  time,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────

export const eventStatusEnum = pgEnum("event_status", [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
  "cancelled",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "masterclass",
  "drinks_reception",
  "team_building",
  "corporate",
  "exhibition",
  "other",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "cocktails_mocktails",
  "smoothies",
  "hybrid",
]);

export const seasonEnum = pgEnum("season", [
  "spring",
  "summer",
  "autumn",
  "winter",
  "all_year",
]);

export const glassTypeEnum = pgEnum("glass_type", [
  "rocks",
  "coupe",
  "highball",
  "martini",
  "flute",
  "polycarb_rocks",
  "other",
]);

export const ingredientCategoryEnum = pgEnum("ingredient_category", [
  "spirit",
  "puree",
  "juice",
  "syrup",
  "citrus",
  "modifier",
  "foamer",
  "soda",
  "other",
]);

export const ingredientUnitEnum = pgEnum("ingredient_unit", [
  "ml",
  "g",
  "drops",
  "dash",
  "piece",
  "whole",
  "bunch",
  "sprig",
]);

export const garnishCategoryEnum = pgEnum("garnish_category", [
  "fruit",
  "botanical",
  "decorative",
  "spray",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "super_admin",
  "partner",
]);

export const scalingRuleEnum = pgEnum("scaling_rule", [
  "per_station",
  "fixed",
  "per_spirit",
  "per_ingredient",
]);

// ── Users ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Events ─────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by").references(() => users.id),

  // Core
  eventName: text("event_name").notNull(),
  showName: text("show_name"),
  eventDate: date("event_date").notNull(),
  arriveTime: time("arrive_time"),
  setupDeadline: time("setup_deadline"),
  serviceStart: time("service_start"),
  serviceEnd: time("service_end"),
  departTime: time("depart_time"),
  venueName: text("venue_name").notNull(),
  venueHallRoom: text("venue_hall_room"),
  guestCount: integer("guest_count").notNull(),

  // Service configuration
  eventType: eventTypeEnum("event_type").default("corporate"),
  serviceType: serviceTypeEnum("service_type").default("cocktails_mocktails"),
  prepaidServes: integer("prepaid_serves"),
  stationCount: integer("station_count"),
  stationLayoutNotes: text("station_layout_notes"),
  batchingInstructions: text("batching_instructions"),

  // Staff
  staffCount: integer("staff_count"),
  staffNames: text("staff_names"),
  flairRequired: boolean("flair_required").default(false),

  // Equipment and setup
  popUpBar: boolean("pop_up_bar").default(false),
  popUpBarSupplier: text("pop_up_bar_supplier"),
  dryIce: boolean("dry_ice").default(false),
  menuFrameCount: integer("menu_frame_count"),
  menuNotes: text("menu_notes"),

  // Logistics
  installInstructions: text("install_instructions"),
  parkingInstructions: text("parking_instructions"),
  accessRoute: text("access_route"),
  vehicleReg: text("vehicle_reg"),

  // Card payment service
  cardPaymentService: boolean("card_payment_service").default(false),
  cardPaymentPrice: decimal("card_payment_price"),
  cardPaymentServes: integer("card_payment_serves"),
  cardPaymentCommission: decimal("card_payment_commission"),

  // Financial
  invoiceAmount: decimal("invoice_amount"),
  costAmount: decimal("cost_amount"),
  stockReturnPolicy: text("stock_return_policy"),

  // LC communication
  lcRecipient: text("lc_recipient").default("Rory"),
  lcSentAt: timestamp("lc_sent_at"),
  lcConfirmedAt: timestamp("lc_confirmed_at"),

  // Status and lifecycle
  status: eventStatusEnum("status").default("enquiry").notNull(),
  notesCustom: text("notes_custom"),
  outcomeNotes: text("outcome_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
});

// ── Event Contacts ─────────────────────────────────────

export const eventContacts = pgTable("event_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  contactName: text("contact_name").notNull(),
  contactRole: text("contact_role"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  isPrimary: boolean("is_primary").default(false),
  sortOrder: integer("sort_order").default(0),
});

// ── Cocktails (Recipe Library) ─────────────────────────

export const cocktails = pgTable("cocktails", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  defaultMenuName: text("default_menu_name").notNull(),
  defaultMenuDescription: text("default_menu_description"),
  season: seasonEnum("season").default("all_year"),
  glassType: glassTypeEnum("glass_type").default("rocks"),
  iceAmountG: integer("ice_amount_g"),
  iceType: text("ice_type"),
  straw: boolean("straw").default(false),
  strawType: text("straw_type"),
  category: text("category"),
  referenceImageUrl: text("reference_image_url"),
  isNonAlcoholic: boolean("is_non_alcoholic").default(false),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Cocktail Ingredients ───────────────────────────────

export const cocktailIngredients = pgTable("cocktail_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  cocktailId: uuid("cocktail_id")
    .references(() => cocktails.id, { onDelete: "cascade" })
    .notNull(),
  ingredientName: text("ingredient_name").notNull(),
  ingredientCategory: ingredientCategoryEnum("ingredient_category").default(
    "other"
  ),
  amount: decimal("amount").notNull(),
  unit: ingredientUnitEnum("unit").notNull(),
  brand: text("brand"),
  isOptional: boolean("is_optional").default(false),
  sortOrder: integer("sort_order").default(0),
});

// ── Cocktail Garnishes ─────────────────────────────────

export const cocktailGarnishes = pgTable("cocktail_garnishes", {
  id: uuid("id").primaryKey().defaultRandom(),
  cocktailId: uuid("cocktail_id")
    .references(() => cocktails.id, { onDelete: "cascade" })
    .notNull(),
  garnishName: text("garnish_name").notNull(),
  garnishCategory: garnishCategoryEnum("garnish_category").default("fruit"),
  quantity: decimal("quantity").notNull(),
  quantityUnit: text("quantity_unit").default("piece"),
  sortOrder: integer("sort_order").default(0),
});

// ── Event Cocktails (Junction) ─────────────────────────

export const eventCocktails = pgTable("event_cocktails", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  cocktailId: uuid("cocktail_id")
    .references(() => cocktails.id)
    .notNull(),
  menuName: text("menu_name").notNull(),
  menuDescription: text("menu_description"),
  stationNumber: integer("station_number"),
  servesAllocated: integer("serves_allocated"),
  sortOrder: integer("sort_order").default(0),
});

// ── Event Checklists ──────────────────────────────────

export const eventChecklists = pgTable("event_checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Equipment Templates ───────────────────────────────

export const equipmentTemplates = pgTable("equipment_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const equipmentTemplateItems = pgTable("equipment_template_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .references(() => equipmentTemplates.id, { onDelete: "cascade" })
    .notNull(),
  itemName: text("item_name").notNull(),
  baseQuantity: integer("base_quantity").notNull().default(1),
  scalingRule: scalingRuleEnum("scaling_rule").notNull().default("fixed"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ── Event Equipment ───────────────────────────────────

export const eventEquipment = pgTable("event_equipment", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  isFromTemplate: boolean("is_from_template").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ── Standard Notes ────────────────────────────────────

export const standardNotes = pgTable("standard_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventStandardNotes = pgTable("event_standard_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  noteId: uuid("note_id")
    .references(() => standardNotes.id)
    .notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ── Relations ──────────────────────────────────────────

export const eventsRelations = relations(events, ({ many, one }) => ({
  contacts: many(eventContacts),
  cocktails: many(eventCocktails),
  checklists: many(eventChecklists),
  equipment: many(eventEquipment),
  standardNotes: many(eventStandardNotes),
  createdByUser: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
}));

export const cocktailsRelations = relations(cocktails, ({ many }) => ({
  ingredients: many(cocktailIngredients),
  garnishes: many(cocktailGarnishes),
  eventCocktails: many(eventCocktails),
}));

export const eventCocktailsRelations = relations(
  eventCocktails,
  ({ one }) => ({
    event: one(events, {
      fields: [eventCocktails.eventId],
      references: [events.id],
    }),
    cocktail: one(cocktails, {
      fields: [eventCocktails.cocktailId],
      references: [cocktails.id],
    }),
  })
);

export const cocktailIngredientsRelations = relations(
  cocktailIngredients,
  ({ one }) => ({
    cocktail: one(cocktails, {
      fields: [cocktailIngredients.cocktailId],
      references: [cocktails.id],
    }),
  })
);

export const cocktailGarnishesRelations = relations(
  cocktailGarnishes,
  ({ one }) => ({
    cocktail: one(cocktails, {
      fields: [cocktailGarnishes.cocktailId],
      references: [cocktails.id],
    }),
  })
);

export const eventContactsRelations = relations(
  eventContacts,
  ({ one }) => ({
    event: one(events, {
      fields: [eventContacts.eventId],
      references: [events.id],
    }),
  })
);

export const eventChecklistsRelations = relations(
  eventChecklists,
  ({ one }) => ({
    event: one(events, {
      fields: [eventChecklists.eventId],
      references: [events.id],
    }),
  })
);

export const equipmentTemplatesRelations = relations(
  equipmentTemplates,
  ({ many }) => ({
    items: many(equipmentTemplateItems),
  })
);

export const equipmentTemplateItemsRelations = relations(
  equipmentTemplateItems,
  ({ one }) => ({
    template: one(equipmentTemplates, {
      fields: [equipmentTemplateItems.templateId],
      references: [equipmentTemplates.id],
    }),
  })
);

export const eventEquipmentRelations = relations(
  eventEquipment,
  ({ one }) => ({
    event: one(events, {
      fields: [eventEquipment.eventId],
      references: [events.id],
    }),
  })
);

export const standardNotesRelations = relations(
  standardNotes,
  ({ many }) => ({
    eventNotes: many(eventStandardNotes),
  })
);

export const eventStandardNotesRelations = relations(
  eventStandardNotes,
  ({ one }) => ({
    event: one(events, {
      fields: [eventStandardNotes.eventId],
      references: [events.id],
    }),
    note: one(standardNotes, {
      fields: [eventStandardNotes.noteId],
      references: [standardNotes.id],
    }),
  })
);
