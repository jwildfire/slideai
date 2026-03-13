// Feature: slideai-framework, Property 14: Programmatic API returns structured results
'use strict';

const fc = require('fast-check');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { scaffold, screenshot, renderHtml, renderPdf } = require('../lib/index.js');

/**
 * Validates: Requirements 7.3
 *
 * Property 14: Programmatic API returns structured results
 * For any invocation of a library function (scaffold, screenshot, renderHtml,
 * renderPdf), the return value shall be an object containing at minimum a
 * `success` boolean property, and when `success` is false, an `error` string
 * property.
 */

/**
 * Assert the structured result shape: success is boolean,
 * and when success is false, error is a non-empty string.
 */
function assertStructuredResult(result) {
  expect(result).toBeDefined();
  expect(typeof result).toBe('object');
  expect(typeof result.success).toBe('boolean');
  if (!result.success) {
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  }
}

describe('Property 14: Programmatic API returns structured results', () => {

  // Arbitrary for invalid template names (unlikely to match 'default')
  const invalidTemplateArb = fc.stringMatching(/^[a-z]{3,12}_invalid$/);

  // Arbitrary for random deck names
  const deckNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{1,15}$/);

  // Arbitrary for non-existent QMD paths
  const nonExistentQmdArb = fc.stringMatching(
    /^\/tmp\/nonexistent_[a-zA-Z0-9]{1,12}\/[a-zA-Z0-9]{1,12}\.qmd$/
  );

  describe('scaffold returns structured results', () => {
    it('returns structured result with invalid template names', () => {
      fc.assert(
        fc.property(
          deckNameArb,
          invalidTemplateArb,
          (name, template) => {
            const result = scaffold({ name, template });
            assertStructuredResult(result);
            // Invalid template should fail
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns structured result with valid inputs (success case)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideai-api-'));
      let counter = 0;
      try {
        fc.assert(
          fc.property(
            deckNameArb,
            (name) => {
              const uniqueName = `${name}_${counter++}`;
              const outputPath = path.join(tmpDir, uniqueName);
              const result = scaffold({ name: uniqueName, outputPath });
              assertStructuredResult(result);
              // Valid scaffold should succeed
              expect(result.success).toBe(true);
            }
          ),
          { numRuns: 20 }
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('renderHtml returns structured results', () => {
    it('returns structured result for non-existent QMD paths', () => {
      fc.assert(
        fc.property(
          nonExistentQmdArb,
          (qmdPath) => {
            const result = renderHtml({ qmdPath });
            assertStructuredResult(result);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('renderPdf returns structured results', () => {
    it('returns structured result for non-existent QMD paths', () => {
      fc.assert(
        fc.property(
          nonExistentQmdArb,
          (qmdPath) => {
            const result = renderPdf({ qmdPath });
            assertStructuredResult(result);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('screenshot returns structured results', () => {
    it('returns structured result for invalid inputs (no Playwright)', async () => {
      // screenshot is async and will fail when Playwright can't launch
      // or when given empty/invalid URLs — either way, result must be structured
      const result = await screenshot({
        urls: [],
        outputDir: path.join(os.tmpdir(), 'slideai-ss-test'),
      });
      assertStructuredResult(result);
    }, 15000);

    it('returns structured result with various URL counts', async () => {
      // With empty URL arrays, screenshot should succeed with empty captured.
      // Each call launches Playwright so we keep numRuns low and extend timeout.
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slideai-ss-'));
      try {
        await fc.assert(
          fc.asyncProperty(
            fc.constant(0),
            async () => {
              const result = await screenshot({ urls: [], outputDir: tmpDir });
              assertStructuredResult(result);
              expect(result.success).toBe(true);
              expect(result.captured).toEqual([]);
            }
          ),
          { numRuns: 3 }
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }, 30000);
  });
});