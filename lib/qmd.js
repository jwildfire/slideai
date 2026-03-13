'use strict';

/**
 * QMD Parser/Writer — parses and writes Quarto Markdown files,
 * preserving structure during round-trips.
 */

/**
 * Parse a QMD string into a structured document.
 *
 * @param {string} content - Raw QMD file content
 * @returns {{ frontMatter: string, slides: Array<{ heading: string, headingLevel: number, classes: string[], body: string }>, trailingContent: string }}
 */
function parseQmd(content) {
  let frontMatter = '';
  let remaining = content;

  // Extract YAML front matter between --- delimiters
  const fmMatch = content.match(/^---\n([\s\S]*?\n)---\n?/);
  if (fmMatch) {
    frontMatter = fmMatch[1];
    remaining = content.slice(fmMatch[0].length);
  }

  // Find all heading positions (#{1,2} at start of line)
  const headingRegex = /^(#{1,2})\s+(.*)$/gm;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(remaining)) !== null) {
    headings.push({
      index: match.index,
      length: match[0].length,
      level: match[1].length,
      rawText: match[2],
    });
  }

  if (headings.length === 0) {
    return { frontMatter, slides: [], trailingContent: remaining };
  }

  // Content before first heading
  const preContent = remaining.slice(0, headings[0].index);

  // Build slides
  const slides = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const { heading, classes } = parseHeadingText(h.rawText);

    // Body: from end of heading line to start of next heading (or end of string)
    const bodyStart = h.index + h.length;
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].index : remaining.length;
    let body = remaining.slice(bodyStart, bodyEnd);

    // Strip the single newline immediately after the heading line
    if (body.startsWith('\n')) {
      body = body.slice(1);
    }

    slides.push({ heading, headingLevel: h.level, classes, body });
  }

  // Pre-content (between front matter and first heading) is typically just
  // a newline. We store it so writeQmd can reproduce it.
  // Trailing content is empty since last slide body extends to end of string.
  return { frontMatter, slides, trailingContent: '', _preContent: preContent };
}

/**
 * Parse heading text to extract the display text and CSS classes.
 * Handles patterns like: "My Title {.class1 .class2}"
 *
 * @param {string} rawText
 * @returns {{ heading: string, classes: string[] }}
 */
function parseHeadingText(rawText) {
  const classes = [];
  let heading = rawText;

  const classMatch = rawText.match(/\s*\{([^}]*)\}\s*$/);
  if (classMatch) {
    const tokens = classMatch[1].match(/\.[\w-]+/g);
    if (tokens) {
      for (const t of tokens) {
        classes.push(t.slice(1));
      }
    }
    heading = rawText.slice(0, classMatch.index);
  }

  return { heading: heading.trimEnd(), classes };
}

/**
 * Write a QmdDocument back to a string.
 *
 * @param {{ frontMatter: string, slides: Array<{ heading: string, headingLevel: number, classes: string[], body: string }>, trailingContent: string }} doc
 * @returns {string}
 */
function writeQmd(doc) {
  let out = '';

  // Front matter
  if (doc.frontMatter) {
    out += '---\n' + doc.frontMatter + '---\n';
  }

  // Pre-content (gap between front matter and first slide)
  const preContent = doc._preContent != null ? doc._preContent : '\n';
  out += preContent;

  // Slides
  for (const slide of doc.slides) {
    const hashes = '#'.repeat(slide.headingLevel);
    const classStr = slide.classes && slide.classes.length > 0
      ? `{${slide.classes.map(c => `.${c}`).join(' ')}}`
      : '';

    // Reconstruct: "## heading {.classes}" or "## {.classes}" or "## heading"
    const parts = [hashes];
    if (slide.heading && classStr) {
      parts.push(`${slide.heading} ${classStr}`);
    } else if (slide.heading) {
      parts.push(slide.heading);
    } else if (classStr) {
      parts.push(classStr);
    }
    const headingLine = parts.join(' ');

    out += headingLine + '\n';

    if (slide.body) {
      out += slide.body;
    }
  }

  // Trailing content
  if (doc.trailingContent) {
    out += doc.trailingContent;
  }

  return out;
}

/**
 * Append new slides to a document, returning a new QmdDocument (immutable).
 *
 * @param {{ frontMatter: string, slides: Array, trailingContent: string }} doc
 * @param {Array<{ heading: string, headingLevel: number, classes: string[], body: string }>} newSlides
 * @returns {{ frontMatter: string, slides: Array, trailingContent: string }}
 */
function appendSlides(doc, newSlides) {
  return {
    frontMatter: doc.frontMatter,
    slides: [...doc.slides, ...newSlides],
    trailingContent: doc.trailingContent,
    _preContent: doc._preContent,
  };
}

module.exports = { parseQmd, writeQmd, appendSlides };
