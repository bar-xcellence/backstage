CREATE TYPE "public"."event_status" AS ENUM('enquiry', 'confirmed', 'preparation', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('masterclass', 'drinks_reception', 'team_building', 'corporate', 'exhibition', 'other');--> statement-breakpoint
CREATE TYPE "public"."garnish_category" AS ENUM('fruit', 'botanical', 'decorative', 'spray');--> statement-breakpoint
CREATE TYPE "public"."glass_type" AS ENUM('rocks', 'coupe', 'highball', 'martini', 'flute', 'polycarb_rocks', 'other');--> statement-breakpoint
CREATE TYPE "public"."ingredient_category" AS ENUM('spirit', 'puree', 'juice', 'syrup', 'citrus', 'modifier', 'foamer', 'soda', 'other');--> statement-breakpoint
CREATE TYPE "public"."ingredient_unit" AS ENUM('ml', 'g', 'drops', 'dash', 'piece', 'whole', 'bunch', 'sprig');--> statement-breakpoint
CREATE TYPE "public"."season" AS ENUM('spring', 'summer', 'autumn', 'winter', 'all_year');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('cocktails_mocktails', 'smoothies', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'super_admin', 'partner');--> statement-breakpoint
CREATE TABLE "cocktail_garnishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cocktail_id" uuid NOT NULL,
	"garnish_name" text NOT NULL,
	"garnish_category" "garnish_category" DEFAULT 'fruit',
	"quantity" numeric NOT NULL,
	"quantity_unit" text DEFAULT 'piece',
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "cocktail_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cocktail_id" uuid NOT NULL,
	"ingredient_name" text NOT NULL,
	"ingredient_category" "ingredient_category" DEFAULT 'other',
	"amount" numeric NOT NULL,
	"unit" "ingredient_unit" NOT NULL,
	"brand" text,
	"is_optional" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "cocktails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"default_menu_name" text NOT NULL,
	"default_menu_description" text,
	"season" "season" DEFAULT 'all_year',
	"glass_type" "glass_type" DEFAULT 'rocks',
	"ice_amount_g" integer,
	"ice_type" text,
	"straw" boolean DEFAULT false,
	"straw_type" text,
	"category" text,
	"reference_image_url" text,
	"is_non_alcoholic" boolean DEFAULT false,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_cocktails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"cocktail_id" uuid NOT NULL,
	"menu_name" text NOT NULL,
	"menu_description" text,
	"station_number" integer,
	"serves_allocated" integer,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "event_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"contact_name" text NOT NULL,
	"contact_role" text,
	"contact_phone" text,
	"contact_email" text,
	"is_primary" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"event_name" text NOT NULL,
	"show_name" text,
	"event_date" date NOT NULL,
	"arrive_time" time,
	"setup_deadline" time,
	"service_start" time,
	"service_end" time,
	"depart_time" time,
	"venue_name" text NOT NULL,
	"venue_hall_room" text,
	"guest_count" integer NOT NULL,
	"event_type" "event_type" DEFAULT 'corporate',
	"service_type" "service_type" DEFAULT 'cocktails_mocktails',
	"prepaid_serves" integer,
	"station_count" integer,
	"station_layout_notes" text,
	"batching_instructions" text,
	"staff_count" integer,
	"staff_names" text,
	"flair_required" boolean DEFAULT false,
	"pop_up_bar" boolean DEFAULT false,
	"pop_up_bar_supplier" text,
	"dry_ice" boolean DEFAULT false,
	"menu_frame_count" integer,
	"menu_notes" text,
	"install_instructions" text,
	"parking_instructions" text,
	"access_route" text,
	"vehicle_reg" text,
	"card_payment_service" boolean DEFAULT false,
	"card_payment_price" numeric,
	"card_payment_serves" integer,
	"card_payment_commission" numeric,
	"invoice_amount" numeric,
	"cost_amount" numeric,
	"stock_return_policy" text,
	"lc_recipient" text DEFAULT 'Rory',
	"lc_sent_at" timestamp,
	"lc_confirmed_at" timestamp,
	"status" "event_status" DEFAULT 'enquiry' NOT NULL,
	"notes_custom" text,
	"outcome_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cocktail_garnishes" ADD CONSTRAINT "cocktail_garnishes_cocktail_id_cocktails_id_fk" FOREIGN KEY ("cocktail_id") REFERENCES "public"."cocktails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cocktail_ingredients" ADD CONSTRAINT "cocktail_ingredients_cocktail_id_cocktails_id_fk" FOREIGN KEY ("cocktail_id") REFERENCES "public"."cocktails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_checklists" ADD CONSTRAINT "event_checklists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_cocktails" ADD CONSTRAINT "event_cocktails_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_cocktails" ADD CONSTRAINT "event_cocktails_cocktail_id_cocktails_id_fk" FOREIGN KEY ("cocktail_id") REFERENCES "public"."cocktails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_contacts" ADD CONSTRAINT "event_contacts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;