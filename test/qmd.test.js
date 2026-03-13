// Feature: slideai-framework, Property 8: Slide insertion preserves existing content
'use strict';

const fc = require('fast-check');
const { parseQmd, writeQmd, appendSlides } = require('../lib/qmd.js');

/**
 * Validates: Requirements 2.7, 8.1, 8.3, 8.4
 *
 * Property 8: Slide insertion preserves existing content
 * For any valid QMD file content and any list of new slides, parsing the QMD,
 * appending the new slides, and writing back to a string shall produce output
 * where the original slides appear unchanged and in their original order,
 * with the new slides appended after them.
 */

// --- Arbitraries ---

/** Generate a simple alphanumeric string (non-empty, safe for YAML/headings, no trailing spaces). */
const safeString = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,29}[a-zA-Z0-9]$/);

/** Generate a valid YAML front matter block with title, subtitle, and date. */
const frontMatterArb = fc.record({
  title: safeString,
  subtitle: safeString,
  year: fc.integer({ min: 2000, max: 2030 }),
  month: fc.integer({ min: 1, max: 12 }),
  day: fc.integer({ min: 1, max: 28 }),
}).map(({ title, subtitle, year, month, day }) => {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return `title: "${title}"\nsubtitle: "${subtitle}"\ndate: "${dateStr}"\nformat: revealjs\n`;
});

/** Generate a CSS class name (lowercase letters + hyphens). */
const cssClassArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}[a-z0-9]$/);

/** Generate a single QMD slide. */
const slideArb = fc.record({
  heading: safeString,
  headingLevel: fc.constantFrom(1, 2),
  classes: fc.array(cssClassArb, { minLength: 0, maxLength: 3 }),
  body: fc.array(safeString, { minLength: 0, maxLength: 3 }).map(lines =>
    lines.length > 0 ? lines.join('\n') + '\n\n' : ''
  ),
});

/** Generate a valid QMD document string with front matter and slides. */
const qmdDocArb = fc.record({
  frontMatter: frontMatterArb,
  slides: fc.array(slideArb, { minLength: 1, maxLength: 6 }),
}).map(({ frontMatter, slides }) => {
  let content = `---\n${frontMatter}---\n\n`;
  for (const slide of slides) {
    const hashes = '#'.repeat(slide.headingLevel);
    const classStr = slide.classes.length > 0
      ? ` {${slide.classes.map(c => `.${c}`).join(' ')}}`
      : '';
    content += `${hashes} ${slide.heading}${classStr}\n`;
    if (slide.body) {
      content += slide.body;
    }
  }
  return content;
});

/** Generate new slides to append. */
const newSlidesArb = fc.array(slideArb, { minLength: 1, maxLength: 4 });

// --- Property Test ---

describe('QMD round-trip preservation (Property 8)', () => {
  it('slide insertion preserves existing content', () => {
    fc.assert(
      fc.property(qmdDocArb, newSlidesArb, (qmdString, newSlides) => {
        // 1. Parse the original QMD
        const originalDoc = parseQmd(qmdString);
        const originalSlideCount = originalDoc.slides.length;

        // 2. Append new slides
        const extendedDoc = appendSlides(originalDoc, newSlides);

        // 3. Write back to string
        const written = writeQmd(extendedDoc);

        // 4. Re-parse the result
        const reparsed = parseQmd(written);

        // 5. Verify original slides appear unchanged and in original order
        expect(reparsed.slides.length).toBe(originalSlideCount + newSlides.length);

        for (let i = 0; i < originalSlideCount; i++) {
          const orig = originalDoc.slides[i];
          const after = reparsed.slides[i];

          expect(after.heading).toBe(orig.heading);
          expect(after.headingLevel).toBe(orig.headingLevel);
          expect(after.classes).toEqual(orig.classes);
          expect(after.body).toBe(orig.body);
        }

        // 6. Verify new slides are appended after originals
        for (let i = 0; i < newSlides.length; i++) {
          const appended = reparsed.slides[originalSlideCount + i];
          expect(appended.heading).toBe(newSlides[i].heading);
          expect(appended.headingLevel).toBe(newSlides[i].headingLevel);
          expect(appended.classes).toEqual(newSlides[i].classes);
        }

        // 7. Front matter is preserved
        expect(reparsed.frontMatter).toBe(originalDoc.frontMatter);
      }),
      { numRuns: 100 }
    );
  });
});
