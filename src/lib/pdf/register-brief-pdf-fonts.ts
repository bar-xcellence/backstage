import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Register "Sans" and "Serif" aliases used by brief-pdf.tsx against PDF
 * standard fonts. These are embedded in every PDF viewer — no network
 * fetch, no WOFF2/brotli dependency, no glyph-shaping breakage.
 *
 * Must run in the same module graph as `renderToBuffer` (called from the
 * PDF route) so fonts attach to the FontStore instance used at layout time.
 */
export function registerBriefPdfFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Serif",
    fonts: [
      { src: "Times-Roman", fontStyle: "normal", fontWeight: 400 },
      { src: "Times-Bold", fontStyle: "normal", fontWeight: 700 },
      { src: "Times-Italic", fontStyle: "italic", fontWeight: 400 },
    ],
  });

  Font.register({
    family: "Sans",
    fonts: [
      { src: "Helvetica", fontStyle: "normal", fontWeight: 400 },
      { src: "Helvetica-Bold", fontStyle: "normal", fontWeight: 700 },
      { src: "Helvetica-Oblique", fontStyle: "italic", fontWeight: 400 },
    ],
  });
}
