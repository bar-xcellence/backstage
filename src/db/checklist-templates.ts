export interface ChecklistTemplate {
  label: string;
  sortOrder: number;
}

const BASE_ITEMS: ChecklistTemplate[] = [
  { label: "Contact details confirmed", sortOrder: 0 },
  { label: "Brief sent to LC", sortOrder: 1 },
  { label: "Stock ordered", sortOrder: 2 },
  { label: "Reference images uploaded", sortOrder: 3 },
  { label: "Batching instructions written", sortOrder: 4 },
  { label: "Parking confirmed", sortOrder: 5 },
  { label: "Equipment packed", sortOrder: 6 },
  { label: "Attire communicated", sortOrder: 7 },
];

const EXHIBITION_EXTRAS: ChecklistTemplate[] = [
  { label: "Banner stand packed", sortOrder: 8 },
  { label: "Table cover packed", sortOrder: 9 },
  { label: "Extension leads packed", sortOrder: 10 },
  { label: "Signage prepared", sortOrder: 11 },
];

export function getTemplateItems(
  eventType: string
): ChecklistTemplate[] {
  if (eventType === "exhibition") {
    return [...BASE_ITEMS, ...EXHIBITION_EXTRAS];
  }
  return [...BASE_ITEMS];
}
