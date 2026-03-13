import { describe, it, expect } from 'vitest';
import { parseOutline } from '../lib/outline.js';

describe('parseOutline', () => {
  it('returns empty array for empty string', () => {
    expect(parseOutline('')).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(parseOutline(null)).toEqual([]);
    expect(parseOutline(undefined)).toEqual([]);
  });

  it('returns empty array for string with no parseable bullets', () => {
    expect(parseOutline('just some text\nno bullets here')).toEqual([]);
  });

  it('parses dash bullets as slide headings', () => {
    const text = '- Introduction\n- Methods\n- Results';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'Introduction', bullets: [] },
      { heading: 'Methods', bullets: [] },
      { heading: 'Results', bullets: [] },
    ]);
  });

  it('parses asterisk bullets as slide headings', () => {
    const text = '* First\n* Second';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'First', bullets: [] },
      { heading: 'Second', bullets: [] },
    ]);
  });

  it('parses numbered bullets as slide headings', () => {
    const text = '1. Overview\n2. Details\n3. Summary';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'Overview', bullets: [] },
      { heading: 'Details', bullets: [] },
      { heading: 'Summary', bullets: [] },
    ]);
  });

  it('collects indented sub-bullets under the current heading', () => {
    const text = '- Introduction\n  - Background\n  - Motivation\n- Methods\n  - Approach A';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'Introduction', bullets: ['Background', 'Motivation'] },
      { heading: 'Methods', bullets: ['Approach A'] },
    ]);
  });

  it('handles mixed bullet markers', () => {
    const text = '- First slide\n* Second slide\n1. Third slide';
    const result = parseOutline(text);
    expect(result).toHaveLength(3);
    expect(result[0].heading).toBe('First slide');
    expect(result[1].heading).toBe('Second slide');
    expect(result[2].heading).toBe('Third slide');
  });

  it('handles indented lines without bullet markers as sub-bullets', () => {
    const text = '- Heading\n  some indented text';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'Heading', bullets: ['some indented text'] },
    ]);
  });

  it('skips blank lines between bullets', () => {
    const text = '- First\n\n- Second\n\n- Third';
    const result = parseOutline(text);
    expect(result).toHaveLength(3);
  });

  it('ignores indented lines before any top-level bullet', () => {
    const text = '  orphan line\n- Actual heading';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'Actual heading', bullets: [] },
    ]);
  });

  it('handles multi-digit numbered bullets', () => {
    const text = '10. Tenth item\n11. Eleventh item';
    const result = parseOutline(text);
    expect(result).toEqual([
      { heading: 'Tenth item', bullets: [] },
      { heading: 'Eleventh item', bullets: [] },
    ]);
  });
});

import fc from 'fast-check';

// --- Arbitraries for outline property tests ---

const bulletMarkerArb = fc.constantFrom('-', '*', '1.');
const safeHeadingArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,30}$/).filter(s => s.trim().length > 0);

// Feature: slideai-framework, Property 3: Outline bullets map to slides
// **Validates: Requirements 1.4, 9.1**
describe('Property 3: Outline bullets map to slides', () => {
  const outlineArb = fc.array(
    fc.record({
      marker: bulletMarkerArb,
      heading: safeHeadingArb,
    }),
    { minLength: 1, maxLength: 20 }
  );

  it('parsing N top-level bullets produces exactly N slides with matching headings', () => {
    fc.assert(
      fc.property(outlineArb, (items) => {
        const outlineText = items.map(({ marker, heading }) => `${marker} ${heading}`).join('\n');
        const result = parseOutline(outlineText);

        // Exactly N slides
        expect(result).toHaveLength(items.length);

        // Each heading matches the bullet text
        for (let i = 0; i < items.length; i++) {
          expect(result[i].heading).toBe(items[i].heading.trim());
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: slideai-framework, Property 15: Outline parsing round trip
// **Validates: Requirements 9.4**
describe('Property 15: Outline parsing round trip', () => {
  const outlineArb = fc.array(
    fc.record({
      marker: bulletMarkerArb,
      heading: safeHeadingArb,
    }),
    { minLength: 1, maxLength: 20 }
  );

  it('parsing outline then extracting headings matches original bullet texts', () => {
    fc.assert(
      fc.property(outlineArb, (items) => {
        const outlineText = items.map(({ marker, heading }) => `${marker} ${heading}`).join('\n');
        const expectedHeadings = items.map(({ heading }) => heading.trim());

        const slides = parseOutline(outlineText);
        const actualHeadings = slides.map(s => s.heading);

        expect(actualHeadings).toEqual(expectedHeadings);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: slideai-framework, Property 16: Sub-bullets are included in slide body
// **Validates: Requirements 9.2**
describe('Property 16: Sub-bullets are included in slide body', () => {
  const subBulletMarkerArb = fc.constantFrom('-', '*');

  const slideWithSubBulletsArb = fc.record({
    marker: bulletMarkerArb,
    heading: safeHeadingArb,
    subBullets: fc.array(
      fc.record({
        subMarker: subBulletMarkerArb,
        text: safeHeadingArb,
      }),
      { minLength: 1, maxLength: 5 }
    ),
  });

  const outlineArb = fc.array(slideWithSubBulletsArb, { minLength: 1, maxLength: 10 });

  it('parsed slide body contains all sub-bullet texts', () => {
    fc.assert(
      fc.property(outlineArb, (items) => {
        const outlineText = items.map(({ marker, heading, subBullets }) => {
          const topLine = `${marker} ${heading}`;
          const subLines = subBullets.map(({ subMarker, text }) => `  ${subMarker} ${text}`);
          return [topLine, ...subLines].join('\n');
        }).join('\n');

        const slides = parseOutline(outlineText);

        expect(slides).toHaveLength(items.length);

        for (let i = 0; i < items.length; i++) {
          const expectedTexts = items[i].subBullets.map(sb => sb.text.trim());
          expect(slides[i].bullets).toHaveLength(expectedTexts.length);
          for (const expectedText of expectedTexts) {
            expect(slides[i].bullets).toContain(expectedText);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
