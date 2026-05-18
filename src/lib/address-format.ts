interface AddressFields {
  venueName?: string | null;
  venueHallRoom?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  venueTenant?: string | null;
  cateringPartner?: string | null;
}

export function formatAddressLines(event: AddressFields): string[] {
  const lines: string[] = [];
  if (event.venueName) lines.push(event.venueName);
  if (event.venueTenant) lines.push(`@ ${event.venueTenant}`);
  if (event.cateringPartner)
    lines.push(`catered by ${event.cateringPartner}`);
  if (event.venueHallRoom) lines.push(event.venueHallRoom);
  if (event.addressLine1) lines.push(event.addressLine1);
  if (event.addressLine2) lines.push(event.addressLine2);
  const cityPost = [event.city, event.postcode].filter(Boolean).join(", ");
  if (cityPost) lines.push(cityPost);
  return lines;
}
