// One-off: create two TEST events similar to Hexaware Masterclass.
// Run with: node --env-file=.env.local scripts/seed-test-events.mjs
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const SPICED_PASSIONSTAR = "0d768514-0abf-43aa-a530-4b1a65c0fbb1";
const CLOVER_CLUB = "3abd40b7-163a-452b-a84e-c4f96b9bcef2";
const NOTE_ATTIRE = "f872c716-be91-4fc5-87ee-6bde4e63442b";
const NOTE_WASHING = "109ea22e-e8e0-4c7c-9408-ce6d2d672cb0";
const NOTE_ESCALATION = "fd21281a-2fac-4fd4-b297-19054a9e05fd";
const NOTE_STOCK = "5482c3ef-9388-4ad6-8644-5f99028b8d16";
const MURDO = "1c0301c7-f2d4-40d8-8bdb-b9dec3b3f735";

const events = [
  {
    eventName: "[TEST] NEC Cocktail Masterclass",
    eventDate: "2026-06-13",
    venueName: "NEC Birmingham",
    venueHallRoom: "Hall 5 — Atrium",
    addressLine1: "National Exhibition Centre",
    addressLine2: "Pendigo Way, Marston Green",
    city: "Birmingham",
    postcode: "B40 1NT",
    status: "preparation",
    notesCustom:
      "TEST EVENT — created for picker/settings dogfooding. 60-minute masterclass, 2 cocktails per guest.",
  },
  {
    eventName: "[TEST] Leeds Arena Cocktail Masterclass",
    eventDate: "2026-06-03",
    venueName: "First Direct Arena",
    venueHallRoom: "Hospitality Lounge",
    addressLine1: "Arena Way",
    addressLine2: null,
    city: "Leeds",
    postcode: "LS2 8BY",
    status: "confirmed",
    notesCustom:
      "TEST EVENT — created for picker/settings dogfooding. 60-minute masterclass, 2 cocktails per guest.",
  },
];

async function createEvent(spec) {
  const existing = await sql`SELECT id FROM events WHERE event_name = ${spec.eventName}`;
  if (existing.length > 0) {
    console.log(`  • already exists: ${spec.eventName} (${existing[0].id})`);
    return existing[0].id;
  }

  const [row] = await sql`
    INSERT INTO events (
      created_by, event_name, event_date,
      arrive_time, setup_deadline, service_start, service_end, depart_time,
      venue_name, venue_hall_room,
      address_line_1, address_line_2, city, postcode,
      guest_count, event_type, service_type,
      prepaid_serves, station_count, station_layout_notes,
      staff_count, staff_names,
      install_instructions,
      status, notes_custom, lc_recipient
    ) VALUES (
      ${MURDO}, ${spec.eventName}, ${spec.eventDate},
      '16:00:00', '18:45:00', '19:15:00', '20:15:00', '20:30:00',
      ${spec.venueName}, ${spec.venueHallRoom},
      ${spec.addressLine1}, ${spec.addressLine2}, ${spec.city}, ${spec.postcode},
      130, 'masterclass', 'cocktails_mocktails',
      260, 13, '13 tables of 10 guests. Each table: 8 glass bottles + foamer + garnishes + ice bucket + scoop + pre-cut garnish plate.',
      4, 'Murdo MacLeod; LC supplies 4 cocktail bartenders',
      'Trolley required. Sealed boxes only — no bags or open boxes. Meet Murdo at venue loading bay at 16:00. Setup complete by 18:45 for 19:15 guest arrival.',
      ${spec.status}, ${spec.notesCustom}, 'rory@lc-group.com'
    ) RETURNING id`;

  const eventId = row.id;
  console.log(`  ✓ inserted ${spec.eventName} (${eventId}) — status=${spec.status}`);

  await sql`INSERT INTO event_contacts (event_id, contact_name, contact_role, contact_phone, is_primary, is_host, sort_order) VALUES
    (${eventId}, 'Murdo MacLeod', 'Host (Bar Excellence)', '07882084422', true, true, 0)`;
  await sql`INSERT INTO event_contacts (event_id, contact_name, contact_role, contact_email, sort_order) VALUES
    (${eventId}, 'Venue Liaison', 'Venue', 'venue@example.com', 1)`;
  await sql`INSERT INTO event_contacts (event_id, contact_name, contact_role, contact_phone, contact_email, sort_order) VALUES
    (${eventId}, 'Test Client', 'Client', '+447000000000', 'client@example.com', 2)`;

  await sql`INSERT INTO event_cocktails (event_id, cocktail_id, menu_name, menu_description, serves_allocated, sort_order) VALUES
    (${eventId}, ${SPICED_PASSIONSTAR}, 'Spiced Passionstar', 'Spiced rum, passionfruit, freshly squeezed lemon, pineapple & glistening with edible glitter', 130, 0)`;
  await sql`INSERT INTO event_cocktails (event_id, cocktail_id, menu_name, menu_description, serves_allocated, sort_order) VALUES
    (${eventId}, ${CLOVER_CLUB}, 'Springtime Clover Club', 'Gin, raspberries, mint, freshly squeezed lemon, elderflower & cloudy apple', 130, 1)`;

  const equipment = [
    ["Glass bottles (labelled, on tables)", 110, false, 0],
    ["Pens for labels", 4, false, 1],
    ["Sticky labels (pack)", 1, false, 2],
    ["Ice bucket", 13, true, 3],
    ["Ice scoop", 13, true, 4],
    ["Fruit plate", 13, true, 5],
    ["Fruit knife", 3, false, 6],
    ["Chopping board", 3, false, 7],
    ["Rocks glass", 140, false, 8],
    ["Coupe glass", 140, false, 9],
    ["Plastic shaker (3-piece)", 140, false, 10],
    ["Brush and dustpan", 1, true, 11],
    ["Trolley", 1, false, 12],
    ["Large plastic box with lid", 6, false, 13],
  ];
  for (const [name, qty, fromTpl, order] of equipment) {
    await sql`INSERT INTO event_equipment (event_id, item_name, quantity, is_from_template, sort_order) VALUES
      (${eventId}, ${name}, ${qty}, ${fromTpl}, ${order})`;
  }

  await sql`INSERT INTO event_stock (event_id, item_name, category, quantity, unit, scaling_rule, sort_order) VALUES
    (${eventId}, 'Miraculous Foamer', 'foamer', '1', 'bottle', 'per_station', 0)`;
  await sql`INSERT INTO event_stock (event_id, item_name, category, quantity, unit, scaling_rule, sort_order) VALUES
    (${eventId}, 'Edible Gold Duster Spray', 'other', '1', 'pack', 'per_station', 1)`;
  await sql`INSERT INTO event_stock (event_id, item_name, category, quantity, unit, brand, scaling_rule, sort_order) VALUES
    (${eventId}, 'Non-alcoholic Gin', 'spirit', '4', 'bottle', null, 'per_event', 2)`;
  await sql`INSERT INTO event_stock (event_id, item_name, category, quantity, unit, brand, scaling_rule, sort_order) VALUES
    (${eventId}, 'Non-alcoholic Spiced Rum', 'spirit', '4', 'bottle', 'Captain Morgan Non Alco Spiced', 'per_event', 3)`;

  await sql`INSERT INTO event_standard_notes (event_id, note_id, sort_order) VALUES
    (${eventId}, ${NOTE_ATTIRE}, 0)`;
  await sql`INSERT INTO event_standard_notes (event_id, note_id, sort_order) VALUES
    (${eventId}, ${NOTE_ESCALATION}, 1)`;
  await sql`INSERT INTO event_standard_notes (event_id, note_id, sort_order) VALUES
    (${eventId}, ${NOTE_STOCK}, 2)`;
  await sql`INSERT INTO event_standard_notes (event_id, note_id, sort_order) VALUES
    (${eventId}, ${NOTE_WASHING}, 3)`;

  return eventId;
}

for (const spec of events) {
  await createEvent(spec);
}

console.log("Done.");
