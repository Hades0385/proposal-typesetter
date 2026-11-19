/**
 * Core Text Normalizer
 * Implements Rules R1 - R6 from Section 4.4 and Section 6.2
 */

export function normalizeLine(line) {
  // Removes leading and trailing whitespace including full-width space U+3000, tabs, and spaces
  return line.replace(/^[\s\u3000\t]+/, '').replace(/[\s\u3000\t]+$/, '');
}

export function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      normalizedText: '',
      lines: [],
      stats: { removedBlankLines: 0, removedLeadingSpaces: 0, totalLines: 0 }
    };
  }

  // Normalize line endings to \n
  const unified = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = unified.split('\n');

  let inCodeBlock = false;
  let removedBlankLines = 0;
  let removedLeadingSpaces = 0;
  const processedLines = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];

    // Check code block fences
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      processedLines.push({
        raw: rawLine,
        text: trimmed,
        type: 'fence',
        inCode: inCodeBlock
      });
      continue;
    }

    if (inCodeBlock) {
      // Inside code block: preserve leading/trailing whitespace & empty lines
      processedLines.push({
        raw: rawLine,
        text: rawLine,
        type: 'code',
        inCode: true
      });
      continue;
    }

    // Outside code block
    // R2: Ignore empty lines
    if (trimmed === '') {
      removedBlankLines++;
      continue;
    }

    // Check if it's a list item: preserve indentation level info
    const listMatch = rawLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const marker = listMatch[2];
      const content = listMatch[3].trimEnd();
      const level = Math.min(3, Math.floor(indentSpaces / 2));
      processedLines.push({
        raw: rawLine,
        text: `${marker} ${content}`,
        type: 'list_item',
        level,
        inCode: false
      });
      continue;
    }

    // R3 & R6: Trim leading whitespace (half-width, full-width U+3000, tabs) and trailing whitespace
    const leadingSpacesMatch = rawLine.match(/^[\s\u3000\t]+/);
    if (leadingSpacesMatch) {
      removedLeadingSpaces += leadingSpacesMatch[0].length;
    }

    const cleaned = normalizeLine(rawLine);
    if (cleaned.length > 0) {
      processedLines.push({
        raw: rawLine,
        text: cleaned,
        type: 'normal',
        inCode: false
      });
    } else {
      removedBlankLines++;
    }
  }

  const normalizedText = processedLines.map(l => l.text).join('\n');

  return {
    normalizedText,
    lines: processedLines,
    stats: {
      removedBlankLines,
      removedLeadingSpaces,
      totalLines: processedLines.length
    }
  };
}
