// Feature: slideai-framework, Property 10: Renderer constructs correct Quarto command
// Feature: slideai-framework, Property 11: Renderer rejects missing QMD file
'use strict';

const fc = require('fast-check');
const { buildCommand, renderHtml, renderPdf } = require('../lib/render.js');

/**
 * Validates: Requirements 3.1, 3.2, 4.1, 4.2
 *
 * Property 10: Renderer constructs correct Quarto command
 * For any valid QMD file path and format (html or pdf), the renderer shall
 * construct a command invoking `quarto render <path>` with the appropriate
 * format flag (--to revealjs for HTML, --to pdf for PDF), and if an output
 * path is specified, include it in the command.
 */
describe('Property 10: Renderer constructs correct Quarto command', () => {

  const qmdPathArb = fc.stringMatching(/^[a-zA-Z0-9_/.-]+\.qmd$/).filter(s => s.length >= 5);
  const outputArb = fc.stringMatching(/^[a-zA-Z0-9_/.-]+$/).filter(s => s.length >= 1);

  it('constructs correct command for html format', () => {
    fc.assert(
      fc.property(
        qmdPathArb,
        (qmdPath) => {
          const cmd = buildCommand({ qmdPath, format: 'html' });
          expect(cmd).toBe(`quarto render ${qmdPath} --to revealjs`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('constructs correct command for pdf format', () => {
    fc.assert(
      fc.property(
        qmdPathArb,
        (qmdPath) => {
          const cmd = buildCommand({ qmdPath, format: 'pdf' });
          expect(cmd).toBe(`quarto render ${qmdPath} --to pdf`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('includes --output flag when output is specified', () => {
    fc.assert(
      fc.property(
        qmdPathArb,
        fc.constantFrom('html', 'pdf'),
        outputArb,
        (qmdPath, format, output) => {
          const cmd = buildCommand({ qmdPath, format, output });
          const formatFlag = format === 'html' ? 'revealjs' : 'pdf';
          expect(cmd).toBe(`quarto render ${qmdPath} --to ${formatFlag} --output ${output}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('command always starts with quarto render and includes path', () => {
    fc.assert(
      fc.property(
        qmdPathArb,
        fc.constantFrom('html', 'pdf'),
        (qmdPath, format) => {
          const cmd = buildCommand({ qmdPath, format });
          expect(cmd.startsWith(`quarto render ${qmdPath}`)).toBe(true);
          expect(cmd).toContain('--to');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 3.4, 4.4
 *
 * Property 11: Renderer rejects missing QMD file
 * For any file path that does not exist on disk, the renderer shall return
 * a failure result with an error message identifying the missing file.
 */
describe('Property 11: Renderer rejects missing QMD file', () => {

  const nonExistentPathArb = fc.stringMatching(/^\/tmp\/nonexistent_[a-zA-Z0-9]{1,20}\/[a-zA-Z0-9]{1,20}\.qmd$/);

  it('renderHtml returns failure for non-existent QMD paths', () => {
    fc.assert(
      fc.property(
        nonExistentPathArb,
        (qmdPath) => {
          const result = renderHtml({ qmdPath });
          expect(result.success).toBe(false);
          expect(result.error).toContain('File not found');
          expect(result.error).toContain(qmdPath);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('renderPdf returns failure for non-existent QMD paths', () => {
    fc.assert(
      fc.property(
        nonExistentPathArb,
        (qmdPath) => {
          const result = renderPdf({ qmdPath });
          expect(result.success).toBe(false);
          expect(result.error).toContain('File not found');
          expect(result.error).toContain(qmdPath);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('failure result has empty outputPath and non-empty error string', () => {
    fc.assert(
      fc.property(
        nonExistentPathArb,
        fc.constantFrom('html', 'pdf'),
        (qmdPath, format) => {
          const fn = format === 'html' ? renderHtml : renderPdf;
          const result = fn({ qmdPath });
          expect(result.success).toBe(false);
          expect(result.outputPath).toBe('');
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
