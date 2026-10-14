/**
 * Robust lightweight markdown & plain-text parser that converts
 * .md and .txt file content into TipTap-compatible HTML.
 */

export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return "<p></p>";
  }

  const lines = markdown.split(/\r?\n/);
  const htmlOutput: string[] = [];

  let inBulletList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const closeOpenLists = () => {
    if (inBulletList) {
      htmlOutput.push("</ul>");
      inBulletList = false;
    }
    if (inOrderedList) {
      htmlOutput.push("</ol>");
      inOrderedList = false;
    }
  };

  const formatInline = (text: string): string => {
    // 1. Escape HTML entities
    let result = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Extract inline code to avoid formatting inside code spans
    const codeTokens: string[] = [];
    result = result.replace(/`([^`]+)`/g, (_match, codeContent) => {
      const token = `@@CODE_TOKEN_${codeTokens.length}@@`;
      codeTokens.push(`<code>${codeContent}</code>`);
      return token;
    });

    // 3. Bold + Italic: ***text*** or ___text___
    result = result.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
    result = result.replace(/___(.*?)___/g, "<strong><em>$1</em></strong>");

    // 4. Bold: **text** or __text__
    result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/__(.*?)__/g, "<strong>$1</strong>");

    // 5. Italic: *text* or _text_ (word-boundary safe for snake_case)
    result = result.replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>");
    result = result.replace(/(^|\s)_([^_\s][^_]*?)_(?=\s|$|[.,!?;:])/g, "$1<em>$2</em>");

    // 6. Strikethrough: ~~text~~
    result = result.replace(/~~(.*?)~~/g, "<s>$1</s>");

    // 7. Links: [text](url)
    result = result.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|\/[^\s)]*|#[^\s)]*)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // 8. Re-insert inline code
    codeTokens.forEach((codeHtml, idx) => {
      result = result.replace(`@@CODE_TOKEN_${idx}@@`, codeHtml);
    });

    return result;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code blocks ```
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        htmlOutput.push(`<pre><code>${codeBlockBuffer.join("\n")}</code></pre>`);
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        closeOpenLists();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(
        rawLine
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
      );
      continue;
    }

    // Empty line
    if (!trimmed) {
      closeOpenLists();
      continue;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      closeOpenLists();
      htmlOutput.push(`<h1>${formatInline(trimmed.substring(2).trim())}</h1>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeOpenLists();
      htmlOutput.push(`<h2>${formatInline(trimmed.substring(3).trim())}</h2>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      closeOpenLists();
      htmlOutput.push(`<h3>${formatInline(trimmed.substring(4).trim())}</h3>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      closeOpenLists();
      htmlOutput.push(`<blockquote><p>${formatInline(trimmed.substring(2).trim())}</p></blockquote>`);
      continue;
    }

    // Bulleted list: -, *, +
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (inOrderedList) {
        htmlOutput.push("</ol>");
        inOrderedList = false;
      }
      if (!inBulletList) {
        htmlOutput.push("<ul>");
        inBulletList = true;
      }
      htmlOutput.push(`<li>${formatInline(bulletMatch[1])}</li>`);
      continue;
    }

    // Ordered list: 1., 2., etc.
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (inBulletList) {
        htmlOutput.push("</ul>");
        inBulletList = false;
      }
      if (!inOrderedList) {
        htmlOutput.push("<ol>");
        inOrderedList = true;
      }
      htmlOutput.push(`<li>${formatInline(orderedMatch[1])}</li>`);
      continue;
    }

    // Markdown Table parsing (| Header 1 | Header 2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      const isSeparator =
        nextTrimmed.startsWith("|") &&
        nextTrimmed.endsWith("|") &&
        /^\|[\s\-:|]+\|$/.test(nextTrimmed);
      if (isSeparator) {
        closeOpenLists();
        const headerCells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => formatInline(c.trim()));
        const headerHtml = `<thead><tr>${headerCells.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`;

        i++; // skip separator line
        const bodyRows: string[] = [];

        while (
          i + 1 < lines.length &&
          lines[i + 1].trim().startsWith("|") &&
          lines[i + 1].trim().endsWith("|")
        ) {
          i++;
          const rowLine = lines[i].trim();
          const cells = rowLine
            .slice(1, -1)
            .split("|")
            .map((c) => formatInline(c.trim()));
          bodyRows.push(`<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`);
        }

        const bodyHtml = bodyRows.length > 0 ? `<tbody>${bodyRows.join("")}</tbody>` : "";
        htmlOutput.push(`<table>${headerHtml}${bodyHtml}</table>`);
        continue;
      }
    }

    // Normal paragraph
    closeOpenLists();
    htmlOutput.push(`<p>${formatInline(trimmed)}</p>`);

  }

  closeOpenLists();

  if (inCodeBlock && codeBlockBuffer.length > 0) {
    htmlOutput.push(`<pre><code>${codeBlockBuffer.join("\n")}</code></pre>`);
  }

  return htmlOutput.length > 0 ? htmlOutput.join("") : "<p></p>";
}

export function parsePlainTextToHtml(text: string): string {
  if (!text || !text.trim()) {
    return "<p></p>";
  }

  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return escaped.trim() ? `<p>${escaped}</p>` : "<p><br></p>";
    })
    .join("");
}

/**
 * Converts TipTap / Google Docs HTML content back to standard Markdown.
 */
export function exportHtmlToMarkdown(html: string): string {
  if (!html || !html.trim()) {
    return "";
  }

  let content = html;

  // 1. Unescape common HTML entities helper
  const unescapeEntities = (str: string): string => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  };

  // 2. Pre-extract code blocks to prevent inner markup processing
  const codeBlocks: string[] = [];
  content = content.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_match, codeContent) => {
    const token = `@@BLOCK_CODE_${codeBlocks.length}@@`;
    codeBlocks.push(unescapeEntities(codeContent));
    return token;
  });

  // 3. Process tables into Markdown tables
  content = content.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
    const rows: string[][] = [];
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const rMatch of rowMatches) {
      const cells: string[] = [];
      const cellMatches = rMatch.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) || [];
      for (const cMatch of cellMatches) {
        let text = cMatch
          .replace(/<\/?(td|th)[^>]*>/gi, "")
          .replace(/<p[^>]*>/gi, "")
          .replace(/<\/p>/gi, " ")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, "**$2**")
          .replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, "*$2*")
          .replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/(s|del|strike)>/gi, "~~$2~~")
          .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
          .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        cells.push(unescapeEntities(text));
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return "";

    const colCount = Math.max(...rows.map((r) => r.length));
    const headerRow = rows[0];
    while (headerRow.length < colCount) headerRow.push("");

    const mdTable: string[] = [];
    mdTable.push(`| ${headerRow.join(" | ")} |`);
    mdTable.push(`| ${Array(colCount).fill("---").join(" | ")} |`);

    for (let i = 1; i < rows.length; i++) {
      const dataRow = rows[i];
      while (dataRow.length < colCount) dataRow.push("");
      mdTable.push(`| ${dataRow.join(" | ")} |`);
    }

    return `\n\n${mdTable.join("\n")}\n\n`;
  });

  // 4. Headings
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");

  // 5. Blockquotes
  content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, bqContent) => {
    const cleaned = bqContent.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n").trim();
    const lines = cleaned.split(/\r?\n/).map((l: string) => `> ${l.trim()}`).filter(Boolean);
    return `\n\n${lines.join("\n")}\n\n`;
  });

  // 6. Ordered lists
  content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, listContent) => {
    let index = 1;
    const items: string[] = [];
    const itemMatches = listContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const item of itemMatches) {
      const itemInner = item.replace(/<li[^>]*>/gi, "").replace(/<\/li>/gi, "").trim();
      items.push(`${index}. ${itemInner}`);
      index++;
    }
    return `\n\n${items.join("\n")}\n\n`;
  });

  // 7. Bullet lists
  content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, listContent) => {
    const items: string[] = [];
    const itemMatches = listContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const item of itemMatches) {
      const itemInner = item.replace(/<li[^>]*>/gi, "").replace(/<\/li>/gi, "").trim();
      items.push(`- ${itemInner}`);
    }
    return `\n\n${items.join("\n")}\n\n`;
  });

  // 8. Paragraphs and breaks
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
  content = content.replace(/<br\s*\/?>/gi, "\n");
  content = content.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // 9. Inline marks
  content = content.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, "**$2**");
  content = content.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, "*$2*");
  content = content.replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/(s|del|strike)>/gi, "~~$2~~");
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // 10. Strip remaining HTML tags
  content = content.replace(/<[^>]+>/g, "");

  // 11. Unescape entities
  content = unescapeEntities(content);

  // 12. Restore code blocks
  codeBlocks.forEach((code, idx) => {
    content = content.replace(`@@BLOCK_CODE_${idx}@@`, `\n\n\`\`\`\n${code}\n\`\`\`\n\n`);
  });

  // 13. Normalize whitespace: reduce 3+ consecutive newlines to 2
  return content.replace(/\n{3,}/g, "\n\n").trim();
}
