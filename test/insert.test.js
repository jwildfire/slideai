'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { insertSlides, buildSlide } = require('../lib/insert.js');

// --- Unit tests for insertSlides (Task 5.1) ---

describe('buildSlide', () => {
  it('generates correct markup without caption', () => {
    const image = { url: 'https://example.com', filename: 'report-my-dash.png', filepath: '/tmp/report-my-dash.png', slug: 'my-dash' };
    const slide = buildSlide(image);

    expect(slide.heading).toBe('');
    expect(slide.headingLevel).toBe(2);
    expect(slide.classes).toEqual(['full-image-slide']);
    expect(slide.body).toContain('![](images/report-my-dash.png){fig-alt="Screenshot of my-dash" width="96%"}');
    expect(slide.body).not.toContain('img-caption');
  });

  it('generates correct markup with caption', () => {
    const image = { url: 'https://example.com', filename: 'report-sales.png', filepath: '/tmp/report-sales.png', slug: 'sales' };
    const slide = buildSlide(image, 'Sales Dashboard');

    expect(slide.heading).toBe('');
    expect(slide.headingLevel).toBe(2);
    expect(slide.classes).toEqual(['full-image-slide']);
    expect(slide.body).toContain('![](images/report-sales.png){fig-alt="Screenshot of sales" width="96%"}');
    expect(slide.body).toContain('<p class="img-caption">Sales Dashboard</p>');
  });
});

describe('insertSlides', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insert-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('appends slides to an existing QMD file and returns success', () => {
    const qmdPath = path.join(tmpDir, 'deck.qmd');
    fs.writeFileSync(qmdPath, '---\ntitle: "Test"\nformat: revealjs\n---\n\n## Intro\n\nHello world\n\n');

    const images = [
      { url: 'https://a.com', filename: 'report-alpha.png', filepath: '/tmp/report-alpha.png', slug: 'alpha' },
      { url: 'https://b.com', filename: 'report-beta.png', filepath: '/tmp/report-beta.png', slug: 'beta' },
    ];

    const result = insertSlides({ qmdPath, images, caption: 'Auto-captured' });

    expect(result.success).toBe(true);
    expect(result.slidesAdded).toBe(2);
    expect(result.error).toBeUndefined();

    const written = fs.readFileSync(qmdPath, 'utf-8');
    // Original content preserved
    expect(written).toContain('## Intro');
    expect(written).toContain('Hello world');
    // New slides appended
    expect(written).toContain('## {.full-image-slide}');
    expect(written).toContain('![](images/report-alpha.png){fig-alt="Screenshot of alpha" width="96%"}');
    expect(written).toContain('![](images/report-beta.png){fig-alt="Screenshot of beta" width="96%"}');
    expect(written).toContain('<p class="img-caption">Auto-captured</p>');
  });

  it('appends slides without caption when caption is omitted', () => {
    const qmdPath = path.join(tmpDir, 'deck.qmd');
    fs.writeFileSync(qmdPath, '---\ntitle: "Test"\n---\n\n## Slide 1\n\nContent\n\n');

    const images = [
      { url: 'https://x.com', filename: 'report-x.png', filepath: '/tmp/report-x.png', slug: 'x' },
    ];

    const result = insertSlides({ qmdPath, images });

    expect(result.success).toBe(true);
    expect(result.slidesAdded).toBe(1);

    const written = fs.readFileSync(qmdPath, 'utf-8');
    expect(written).toContain('## {.full-image-slide}');
    expect(written).toContain('![](images/report-x.png)');
    expect(written).not.toContain('img-caption');
  });

  it('preserves front matter and existing slides', () => {
    const qmdPath = path.join(tmpDir, 'deck.qmd');
    const original = '---\ntitle: "My Deck"\nsubtitle: "Sub"\nformat: revealjs\n---\n\n## First\n\nBody 1\n\n## Second\n\nBody 2\n\n';
    fs.writeFileSync(qmdPath, original);

    const images = [
      { url: 'https://c.com', filename: 'report-chart.png', filepath: '/tmp/report-chart.png', slug: 'chart' },
    ];

    const result = insertSlides({ qmdPath, images });

    expect(result.success).toBe(true);
    const written = fs.readFileSync(qmdPath, 'utf-8');
    // Front matter preserved
    expect(written).toContain('title: "My Deck"');
    expect(written).toContain('subtitle: "Sub"');
    // Existing slides preserved
    expect(written).toContain('## First');
    expect(written).toContain('Body 1');
    expect(written).toContain('## Second');
    expect(written).toContain('Body 2');
    // New slide appended
    expect(written).toContain('report-chart.png');
  });

  it('returns error when QMD file does not exist', () => {
    const result = insertSlides({
      qmdPath: path.join(tmpDir, 'nonexistent.qmd'),
      images: [{ url: 'https://x.com', filename: 'report-x.png', filepath: '/tmp/x.png', slug: 'x' }],
    });

    expect(result.success).toBe(false);
    expect(result.slidesAdded).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('handles empty images array', () => {
    const qmdPath = path.join(tmpDir, 'deck.qmd');
    fs.writeFileSync(qmdPath, '---\ntitle: "Test"\n---\n\n## Slide\n\nContent\n\n');

    const result = insertSlides({ qmdPath, images: [] });

    expect(result.success).toBe(true);
    expect(result.slidesAdded).toBe(0);
  });
});

// --- Property-based tests (Task 5.2) ---

const fc = require('fast-check');

// Feature: slideai-framework, Property 9: Full-image-slide markup matches pattern
describe('Property 9: Full-image-slide markup matches pattern', () => {
  // Generator for slug-like strings: alphanumeric + hyphens, non-empty, no leading/trailing hyphens
  const slugCharArb = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split(''));
  const slugArb = fc
    .array(slugCharArb, { minLength: 1, maxLength: 40 })
    .map(chars => chars.join(''))
    .filter(s => /^[a-z0-9]/.test(s) && /[a-z0-9]$/.test(s) && !s.includes('--'));

  // Generator for optional caption strings (either undefined or a non-empty string)
  const captionArb = fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined });

  // **Validates: Requirements 8.2**
  it('generated slide has headingLevel 2 and full-image-slide class for any slug and optional caption', () => {
    fc.assert(
      fc.property(slugArb, captionArb, (slug, caption) => {
        const image = { url: `https://example.com/${slug}`, filename: `report-${slug}.png`, filepath: `/tmp/report-${slug}.png`, slug };
        const slide = buildSlide(image, caption);

        // headingLevel must be 2
        expect(slide.headingLevel).toBe(2);

        // classes must include 'full-image-slide'
        expect(slide.classes).toContain('full-image-slide');

        // body must contain the image reference with the slug
        expect(slide.body).toContain(`![](images/report-${slug}.png)`);

        // When caption is provided, body must contain the caption element
        if (caption !== undefined) {
          expect(slide.body).toContain('<p class="img-caption">');
          expect(slide.body).toContain(caption);
        } else {
          // When no caption, body must NOT contain caption element
          expect(slide.body).not.toContain('img-caption');
        }
      }),
      { numRuns: 100 }
    );
  });
});
