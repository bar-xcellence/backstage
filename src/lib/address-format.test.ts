import { describe, it, expect } from "vitest";
import { formatAddressLines } from "./address-format";

describe("formatAddressLines", () => {
  it("returns just venueName when only that is set", () => {
    expect(formatAddressLines({ venueName: "The Old Pub" })).toEqual([
      "The Old Pub",
    ]);
  });

  it("composes a full multi-line address with all fields", () => {
    expect(
      formatAddressLines({
        venueName: "London Hilton Heathrow",
        venueTenant: "Hexaware",
        cateringPartner: null,
        venueHallRoom: "Terminal 5",
        addressLine1: "Poole Rd",
        addressLine2: "Colnbrook",
        city: "Heathrow",
        postcode: "SL3 0FF",
      })
    ).toEqual([
      "London Hilton Heathrow",
      "@ Hexaware",
      "Terminal 5",
      "Poole Rd",
      "Colnbrook",
      "Heathrow, SL3 0FF",
    ]);
  });

  it("joins city and postcode with a comma on the same line", () => {
    expect(formatAddressLines({ city: "Glasgow", postcode: "G2 7JS" })).toEqual(
      ["Glasgow, G2 7JS"]
    );
  });

  it("includes only city when postcode missing", () => {
    expect(formatAddressLines({ city: "Glasgow" })).toEqual(["Glasgow"]);
  });

  it("includes only postcode when city missing", () => {
    expect(formatAddressLines({ postcode: "G2 7JS" })).toEqual(["G2 7JS"]);
  });

  it("includes catering partner when set", () => {
    expect(
      formatAddressLines({
        venueName: "Aurora",
        venueTenant: "Pinsent Masons",
        cateringPartner: "Lexington Catering",
      })
    ).toEqual([
      "Aurora",
      "@ Pinsent Masons",
      "catered by Lexington Catering",
    ]);
  });

  it("returns empty array when nothing is set", () => {
    expect(formatAddressLines({})).toEqual([]);
  });
});
