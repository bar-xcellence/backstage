interface EventInput {
  eventName: string;
  eventDate: string;
  venueName: string;
  guestCount: number;
}

export function validateEvent(data: EventInput): string[] {
  const errors: string[] = [];

  if (!data.eventName?.trim()) {
    errors.push("Event name is required");
  }
  if (!data.eventDate?.trim()) {
    errors.push("Event date is required");
  }
  if (!data.venueName?.trim()) {
    errors.push("Venue name is required");
  }
  if (!data.guestCount || data.guestCount < 1) {
    errors.push("Guest count must be at least 1");
  }

  return errors;
}

interface SendToLCInput {
  cocktailCount: number;
  prepaidServes: number;
}

export function validateSendToLC(data: SendToLCInput): string[] {
  const errors: string[] = [];

  if (!data.cocktailCount || data.cocktailCount < 1) {
    errors.push("At least one cocktail must be selected");
  }
  if (!data.prepaidServes || data.prepaidServes < 1) {
    errors.push("Prepaid serves must be set");
  }

  return errors;
}
