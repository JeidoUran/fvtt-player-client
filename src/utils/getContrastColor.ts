/**
 * Returns "#000" or "#fff" from a hex value brightness.
 * If color is bright, pick black text, otherwise white.
 */
export function getContrastColor(hex: string): string {
  // remove "#" symbol
  let h = hex.replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  // YIQ formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000" : "#fff";
}
