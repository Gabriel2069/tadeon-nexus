/** Browser-only font fixtures. Font binaries are supplied outside the app. */
import { readFileSync } from "node:fs";
export async function installDesignFonts(page) {
  const dir = process.env.NEXUS_FONT_FIXTURES;
  if (!dir) return;
  const faces = [
    ["Cormorant Garamond", 500, "cormorant-500"],
    ["Cormorant Garamond", 600, "cormorant-600"],
    ["Cormorant Garamond", 700, "cormorant-700"],
    ["Cormorant Garamond", 500, "cormorant-italic-500", "italic"],
    ["Inter", 400, "font-2"],
    ["Inter", 500, "font-3"],
    ["Inter", 600, "font-4"],
    ["PT Mono", 400, "font-5"],
  ]
    .map(
      ([family, weight, file, style = "normal"]) =>
        `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};src:url(data:font/ttf;base64,${readFileSync(`${dir}/${file}.ttf`).toString("base64")}) format("truetype");font-display:swap}`,
    )
    .join("\n");
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: faces }),
  );
}
