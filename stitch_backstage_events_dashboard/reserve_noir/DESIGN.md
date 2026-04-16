# Design System Specification: Premium Hospitality Architecture

## 1. Overview & Creative North Star: "The Digital Maître D’"

This design system is built upon the concept of **The Digital Maître D’**. Like a world-class hospitality experience, the interface must feel authoritative yet invisible, sophisticated yet functional. We are moving away from the "software-as-a-service" aesthetic toward a "digital atelier" feel.

The visual language rejects the playful roundness of modern web trends in favor of **Sharp-Edged Brutalism** and **Editorial Elegance**. By utilizing zero-radius corners, high-contrast serif headings, and a restricted tonal palette, we create an environment that feels like a bespoke leather-bound ledger or a high-end menu.

**Key Principles:**
*   **Precision over Softness:** Sharp corners (0px radius) communicate architectural intent and precision.
*   **Intentional Asymmetry:** Break the rigid grid with oversized serif titles and generous, "wasteful" white space to mimic luxury print layouts.
*   **Atmospheric Depth:** Use high-contrast transitions between deep charcoals and warm creams to define functional zones.

---

## 2. Colors & Surface Logic

Our palette balances the "front of house" (Cream/Gold) with the "back of house" (Charcoal/Dark Mode).

### Tonal Foundation
*   **Primary (Gold):** `#A4731E` (Use for active states and critical calls to action).
*   **Surface (Cream):** `#FAF9F6` (The primary canvas for content).
*   **On-Surface (Gold Ink):** `#7A5416` (Primary text on light backgrounds for a softer, premium contrast than black).
*   **Secondary (Grey):** `#6B7280` (Supporting metadata and secondary UI labels).
*   **Inverse Surface (Charcoal):** `#1E1F2E` (Reserved for sidebars and high-impact navigation).

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Boundaries must be defined through:
1.  **Background Shifts:** Transitioning from `surface` (`#FAF9F6`) to `surface-container-low` (`#F4F3F1`).
2.  **Abutting High Contrast:** A Charcoal sidebar meeting a Cream content area provides all the definition required.

### Glass & Texture
For floating utility panels or mobile overlays, use semi-transparent Charcoal (`#1E1F2E` at 85% opacity) with a `20px` backdrop blur. This "Glassmorphism" adds a layer of modern tech to the classic editorial foundation.

---

## 3. Typography: Editorial Authority

The hierarchy relies on the tension between the timeless **Cormorant Garamond** and the functional **Raleway**.

*   **Display/Headlines:** `Cormorant Garamond`, Weight 300.
    *   *Rule:* Tracking must be set to `-0.02em` to `-0.05em`. The tight letter-spacing gives the light weight a sharp, "ink-on-paper" sharpness.
*   **Body & UI:** `Raleway`, Weights 400 (Body) and 600 (Emphasis).
    *   *Rule:* Never use pure black. Use `Gold Ink` for primary reading and `Grey` for secondary info.
*   **The Utility Label:** `Raleway`, 11px, Uppercase.
    *   *Rule:* Tracking must be heavy (`0.18em`). This is used for eyebrow heads, table headers, and small metadata. It acts as a texture as much as text.

---

## 4. Elevation & Depth: Tonal Layering

Shadows are a last resort. Depth in this system is achieved through physical stacking and "Ghost Borders."

*   **The Layering Principle:** Instead of shadows, use `surface-container-highest` (`#E3E2E0`) to create a recessed effect for input fields or nested cards.
*   **Ambient Shadows:** If a component must float (e.g., a dropdown menu), use an extra-diffused shadow: `0px 20px 40px rgba(30, 31, 46, 0.08)`. The shadow color is a tinted Charcoal, not grey.
*   **The Ghost Border:** For accessibility in forms, use the `outline-variant` token at 15% opacity. It should be felt, not seen.
*   **Sharp Edges:** Under no circumstances will a `border-radius` other than `0px` be used. This applies to buttons, cards, tooltips, and focus states.

---

## 5. Components

### Buttons
*   **Primary:** Background: `Gold (#A4731E)`, Text: `Cream (#FAF9F6)`, 0px Radius.
*   **Secondary:** Border: `1px solid Gold`, Background: `Transparent`, Text: `Gold`.
*   **Attributes:** Min-height 44px for touch compliance. Typography: Raleway 11px, Semi-bold, Uppercase, 0.16em tracking.

### Cards & Containers
*   Forbid divider lines. Separate content using `32px` or `48px` vertical spacing.
*   Group related items by placing them on a slightly darker Cream background (`surface-container-low`).

### Inputs
*   **States:** Default state uses a bottom-border only (2px, `outline-variant`). Active state transitions to a full "Ghost Border" with a Gold accent label.
*   **Error:** Use `Error (#EF4444)` text only; do not turn the entire box red. Maintain the luxury aesthetic even in failure.

### Status Indicators
*   **Cognac (#B8860B):** Premium status / VIP.
*   **Botanical (#8B9D83):** Inventory / Sustainability.
*   **Success (#4E8A3E):** Fulfilled / Paid.
*   *Note:* Use these as small, 8px square accents (0px radius) next to text, never as large flooded backgrounds.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme white space. If a section feels "empty," it is likely correct.
*   **Do** align text-heavy headers to the left and allow them to bleed across columns to break the grid.
*   **Do** use vertical text for side-labels or "eyebrow" titles to enhance the editorial feel.

### Don't:
*   **Don't** use icons as primary navigation without labels. In hospitality, clarity is luxury.
*   **Don't** use "Soft UI" or 3D effects. The system is intentionally flat and architectural.
*   **Don't** use standard 12px or 14px body text for everything. Vary the scale to create a clear "read-order."

---

## 7. Token Summary

| Token | Value | Usage |
| :--- | :--- | :--- |
| `surface` | `#FAF9F6` | Main Content Area |
| `inverse-surface` | `#1E1F2E` | Sidebar / Navigation |
| `primary` | `#A4731E` | CTA / Active State |
| `on-surface` | `#7A5416` | Main Editorial Text |
| `outline-variant` | `#D4C4B2` | Ghost Borders (15% opacity) |
| `radius-none` | `0px` | Every single component |