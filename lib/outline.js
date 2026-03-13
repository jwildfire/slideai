'use strict';

/**
 * Outline Parser — parses a multi-line content outline into slide definitions.
 */

/**
 * Parse a multi-line content outline into an array of slide definitions.
 *
 * Top-level bullets (lines starting with `-`, `*`, or `\d+.`) become slide headings.
 * Indented lines following a top-level bullet become sub-bullets (slide body content).
 * Empty or unparseable input returns an empty array.
 *
 * @param {string} text - Multi-line outline string
 * @returns {Array<{ heading: string, bullets: string[] }>}
 */
function parseOutline(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split('\n');
  const slides = [];
  let current = null;

  // Regex for top-level bullets: line starts with `-`, `*`, or `<digits>.`
  // (no leading whitespace)
  const topLevelRe = /^(?:[-*]|\d+\.)\s+(.*)/;

  for (const line of lines) {
    // Skip completely empty lines
    if (line.trim() === '') {
      continue;
    }

    // Check if this is a top-level bullet (no leading whitespace)
    const isIndented = /^\s/.test(line);

    if (!isIndented) {
      const match = line.match(topLevelRe);
      if (match) {
        // Start a new slide
        current = { heading: match[1].trim(), bullets: [] };
        slides.push(current);
      }
      // Non-matching, non-indented lines are ignored
    } else if (current) {
      // Indented line following a top-level bullet → sub-bullet
      // Strip the leading whitespace and any bullet marker from the sub-bullet
      const stripped = line.trim();
      const subMatch = stripped.match(/^(?:[-*]|\d+\.)\s+(.*)/);
      if (subMatch) {
        current.bullets.push(subMatch[1].trim());
      } else {
        // Indented line without a bullet marker — include as-is
        current.bullets.push(stripped);
      }
    }
  }

  return slides;
}

module.exports = { parseOutline };
