import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { scaffold, listTemplates } from '../lib/scaffold.js';

// --- Helpers ---

/**
 * Create a unique temp directory for a test iteration and return its path.
 */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'slideai-test-'));
}

/**
 * Recursively remove a directory.
 */
function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- Arbitraries ---

const deckNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,20}$/).filter(s => s.length >= 1);

// Feature: slideai-framework, Property 1: Scaffold creates correct directory with required files
// **Validates: Requirements 1.1, 1.2, 1.8**
describe('Property 1: Scaffold creates correct directory with required files', () => {
  const tempDirs = [];

  afterEach(() => {
    for (const d of tempDirs) {
      rmrf(d);
    }
    tempDirs.length = 0;
  });

  it('scaffold creates directory with _quarto.yml, styles.css, images/placeholder.svg, and a valid QMD file', () => {
    fc.assert(
      fc.property(
        deckNameArb,
        fc.boolean(),
        (deckName, useExplicitPath) => {
          const tmpBase = makeTempDir();
          tempDirs.push(tmpBase);

          const opts = { name: deckName };
          if (useExplicitPath) {
            opts.outputPath = path.join(tmpBase, deckName);
          } else {
            // Use a subdirectory so default ./slides/<name> resolves inside tmpBase
            opts.outputPath = path.join(tmpBase, 'slides', deckName);
          }

          const result = scaffold(opts);

          expect(result.success).toBe(true);
          expect(result.outputPath).toBeTruthy();

          // Verify required files exist
          const outDir = result.outputPath;
          expect(fs.existsSync(path.join(outDir, '_quarto.yml'))).toBe(true);
          expect(fs.existsSync(path.join(outDir, 'styles.css'))).toBe(true);
          expect(fs.existsSync(path.join(outDir, 'images', 'placeholder.svg'))).toBe(true);

          // Verify a QMD file exists (index.qmd)
          const qmdPath = path.join(outDir, 'index.qmd');
          expect(fs.existsSync(qmdPath)).toBe(true);

          // Verify QMD contains a title (the deck name)
          const qmdContent = fs.readFileSync(qmdPath, 'utf8');
          expect(qmdContent).toContain(deckName);

          // Verify files array lists the created files
          expect(result.files.length).toBeGreaterThanOrEqual(4);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: slideai-framework, Property 2: Template selection determines QMD content
// **Validates: Requirements 1.3**
describe('Property 2: Template selection determines QMD content', () => {
  const tempDirs = [];

  afterEach(() => {
    for (const d of tempDirs) {
      rmrf(d);
    }
    tempDirs.length = 0;
  });

  it('scaffolding with a template produces QMD derived from that template\'s template.qmd', () => {
    const available = listTemplates();
    expect(available.length).toBeGreaterThan(0);

    const templateNameArb = fc.constantFrom(...available);

    fc.assert(
      fc.property(
        deckNameArb,
        templateNameArb,
        (deckName, templateName) => {
          const tmpBase = makeTempDir();
          tempDirs.push(tmpBase);

          const outDir = path.join(tmpBase, deckName);
          const result = scaffold({ name: deckName, outputPath: outDir, template: templateName });

          expect(result.success).toBe(true);

          // Read the generated QMD
          const qmdContent = fs.readFileSync(path.join(outDir, 'index.qmd'), 'utf8');

          // Read the source template.qmd
          const templatesDir = path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            '..',
            'templates'
          );
          const templateQmd = fs.readFileSync(
            path.join(templatesDir, templateName, 'template.qmd'),
            'utf8'
          );

          // The generated QMD should derive from the template:
          // - The template has {{title}} replaced with the deck name
          // - The structural content (e.g. "Placeholder Slide") should be present
          expect(qmdContent).toContain(deckName);

          // Verify structural elements from the template are preserved
          // The template contains "Placeholder Slide" heading and revealjs format
          if (templateQmd.includes('Placeholder Slide')) {
            expect(qmdContent).toContain('Placeholder Slide');
          }
          if (templateQmd.includes('revealjs')) {
            expect(qmdContent).toContain('revealjs');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: slideai-framework, Property 4: Invalid template name produces error with available list
// **Validates: Requirements 1.6**
describe('Property 4: Invalid template name produces error with available list', () => {
  it('scaffold returns failure with error listing available templates for invalid template names', () => {
    const available = listTemplates();
    expect(available.length).toBeGreaterThan(0);

    const invalidTemplateArb = fc.stringMatching(/^[a-z][a-z0-9]{2,15}$/)
      .filter(s => !available.includes(s));

    fc.assert(
      fc.property(
        deckNameArb,
        invalidTemplateArb,
        (deckName, badTemplate) => {
          const result = scaffold({ name: deckName, template: badTemplate });

          expect(result.success).toBe(false);
          expect(result.error).toBeTruthy();

          // Error message should contain at least one available template name
          const containsAvailable = available.some(t => result.error.includes(t));
          expect(containsAvailable).toBe(true);

          // Error should mention the bad template name
          expect(result.error).toContain(badTemplate);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: slideai-framework, Property 13: Template discovery is dynamic
// **Validates: Requirements 6.3**
describe('Property 13: Template discovery is dynamic', () => {
  const tempDirs = [];

  afterEach(() => {
    for (const d of tempDirs) {
      rmrf(d);
    }
    tempDirs.length = 0;
  });

  it('all directory names in a templates dir appear as available template options', () => {
    const templateDirNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}[a-z0-9]$/)
      .filter(s => s.length >= 2 && !s.includes('--'));

    const templateSetArb = fc.uniqueArray(templateDirNameArb, { minLength: 1, maxLength: 8 });

    fc.assert(
      fc.property(templateSetArb, (templateNames) => {
        const tmpBase = makeTempDir();
        tempDirs.push(tmpBase);

        // Create template directories
        for (const name of templateNames) {
          fs.mkdirSync(path.join(tmpBase, name), { recursive: true });
        }

        // Discover templates from the temp directory
        const discovered = listTemplates(tmpBase);

        // All created directory names should appear in the discovered list
        for (const name of templateNames) {
          expect(discovered).toContain(name);
        }

        // Discovered list should have exactly the same length
        expect(discovered).toHaveLength(templateNames.length);
      }),
      { numRuns: 100 }
    );
  });
});
