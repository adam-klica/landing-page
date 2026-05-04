/**
 * Process post content HTML to add proper list styling
 * This runs on the server side before rendering
 */
export function processPostContent(html: string): string {
  if (!html) return html;

  try {
    let processed = html;

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

    // If we received plain text (e.g. pasted content without rich formatting), convert to basic HTML
    // preserving paragraphs and line breaks.
    if (!looksLikeHtml(processed)) {
      const text = processed.replace(/\r\n/g, "\n");
      const blocks = text.split(/\n{2,}/g).map((b) => b.trim()).filter(Boolean);
      processed = blocks
        .map((b) => `<p>${escapeHtml(b).replace(/\n/g, "<br />")}</p>`)
        .join("");
    }

    // Preserve intentional blank lines from the editor.
    // TipTap can emit empty paragraphs like <p></p> or <p><br></p>;
    // we convert them to explicit spacer paragraphs so frontend keeps multi-Enter spacing.
    processed = processed.replace(
      /<p>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/p>/gi,
      '<p class="spacer-paragraph">&nbsp;</p>'
    );

    // Heuristic: Convert common "plain text lists" into real HTML lists.
    // Handles patterns like: "Intro ... * item 1 * item 2" and emoji bullets: 📍 ... 📍 ...
    const emojiBulletRe = /([📍📌📌📄🎓🛒✅☑️➡️•])\s+/g;
    processed = processed.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs, inner) => {
      const innerText = inner || "";
      if (/<ul|<ol|<li/i.test(innerText)) return full;

      // Asterisk list inside a paragraph: split on " * "
      const asteriskParts = innerText.split(/\s\*\s+/);
      if (asteriskParts.length >= 3) {
        const lead = (asteriskParts[0] || "").trim();
        const items = asteriskParts
          .slice(1)
          .map((s: string) => s.trim())
          .filter((s: string): s is string => s.length > 0);
        if (items.length >= 2) {
          const leadHtml = lead ? `<p${attrs}>${lead}</p>` : "";
          const listHtml = `<ul>${items.map((it: string) => `<li>${it}</li>`).join("")}</ul>`;
          return leadHtml + listHtml;
        }
      }

      // Emoji bullets inside a paragraph: split while keeping emojis
      const matches = innerText.match(emojiBulletRe);
      if (matches && matches.length >= 2) {
        const parts = innerText.split(emojiBulletRe); // includes captured emoji tokens
        // split result: [lead, emoji1, text1, emoji2, text2, ...]
        const lead = (parts[0] || "").trim();
        const items: string[] = [];
        for (let i = 1; i < parts.length; i += 2) {
          const emoji = (parts[i] || "").trim();
          const text = (parts[i + 1] || "").trim();
          if (emoji && text) items.push(`${emoji} ${text}`);
        }
        if (items.length >= 2) {
          const leadHtml = lead ? `<p${attrs}>${lead}</p>` : "";
          const listHtml = `<ul>${items.map((it: string) => `<li>${it}</li>`).join("")}</ul>`;
          return leadHtml + listHtml;
        }
      }

      return full;
    });

    return processed;
  } catch (error) {
    console.error("Error processing post content:", error);
    return html; // Return original on error
  }
}
