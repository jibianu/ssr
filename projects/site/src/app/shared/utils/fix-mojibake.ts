/**
 * Fixes UTF-8 mojibake when text was misinterpreted as Windows-1252.
 * Replaces corrupted sequences with proper Unicode punctuation and symbols/emoji.
 * Use for display of user-generated content and when processing API/DB text.
 */
export function fixUtf8Mojibake(text: string | null | undefined): string {
  if (text == null || typeof text !== 'string') return '';
  return text
    // Punctuation (smart quotes, dashes)
    .replace(/\u00E2\u20AC\u2122/g, '\u2019')   // â€™ → ' (right single quote)
    .replace(/\u00E2\u20AC\u02DC/g, '\u2018')   // â€˜ → ' (left single quote)
    .replace(/\u00E2\u20AC\u0153/g, '\u201C')   // â€œ → " (left double quote)
    .replace(/\u00E2\u20AC\u009D/g, '\u201D')   // â€ → " (right double quote)
    .replace(/\u00E2\u20AC\u201C/g, '\u2013')   // â€" → – (en dash)
    .replace(/\u00E2\u20AC\u201D/g, '\u2014')   // â€" → — (em dash)
    // Check marks / symbols (3-byte UTF-8 misinterpreted)
    .replace(/\u00E2\u009C\u0094/g, '\u2714')   // âœ" → ✔ (heavy check mark)
    .replace(/\u00E2\u009C\u0085/g, '\u2705')   // âœ… → ✅ (white heavy check mark)
    .replace(/\u00E2\u009C\u201D/g, '\u2714')   // âœ" (alt) → ✔
    .replace(/\u00E2\u009C\u2026/g, '\u2705')   // âœ… → ✅
    // 4-byte emoji: ðŸ"Š = F0 9F 93 8A = 📊 (bar chart)
    .replace(/\u00F0\u0178\u201C\u0160/g, '\uD83D\uDCCA')   // ðŸ"Š → 📊
    .replace(/\u00F0\u009F\u201C\u0160/g, '\uD83D\uDCCA')   // variant
    .replace(/\u00F0\u0178\u201C\u008A/g, '\uD83D\uDCCA')   // variant
    .replace(/\u00F0\u009F\u0093\u008A/g, '\uD83D\uDCCA'); // bytes as code points
}
