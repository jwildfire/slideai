'use strict';

const path = require('path');
const fs = require('fs');
const { insertSlides } = require('./insert.js');

/**
 * Generate a URL-safe slug from a title or URL string.
 *
 * Lowercases input, replaces non-alphanumeric characters with hyphens,
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 *
 * @param {string} title - Page title or URL string
 * @returns {string} Slug matching pattern [a-z0-9]+(-[a-z0-9]+)*
 */
function generateSlug(title) {
  if (!title || typeof title !== 'string') return 'report';

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'report';
}

/**
 * Find the optimal vertical scroll position for screenshot capture.
 *
 * Searches for significant content elements (charts, tables, plots) and
 * returns a scroll position that places the first qualifying element in view.
 *
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<number>} Scroll Y position (0 if no qualifying elements found)
 */
async function findScrollY(page) {
  return page.evaluate(() => {
    const selectors = [
      '.plotly',
      '.plot-container',
      '.highcharts-container',
      '.gt_table',
      '.dataTables_wrapper',
      'table',
      'canvas',
      'svg',
    ];

    const tops = [];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const area = Math.max(1, rect.width * rect.height);
        if (top > 220 && area > 10000) tops.push(top);
      }
    }

    if (!tops.length) return 0;
    const target = Math.min(...tops);
    return Math.max(0, Math.round(target - 120));
  });
}

/**
 * Capture screenshots of web pages using Playwright.
 *
 * Launches a headless Chromium browser, navigates to each URL, optionally
 * auto-scrolls to significant content, and captures PNG screenshots.
 * After all captures, optionally inserts slides into a target QMD file.
 *
 * @param {object} options
 * @param {string[]} options.urls - URLs to capture
 * @param {string} options.outputDir - Directory to save PNG files
 * @param {number} [options.width=1600] - Viewport width
 * @param {number} [options.height=800] - Viewport height
 * @param {boolean} [options.autoscroll=true] - Enable auto-scroll heuristic
 * @param {number} [options.timeout=120000] - Page load timeout in ms
 * @param {string} [options.qmdPath] - Target QMD file for slide insertion
 * @param {string} [options.caption] - Optional caption for inserted slides
 * @returns {Promise<{ success: boolean, captured: Array<{ url: string, filename: string, filepath: string, slug: string }>, warnings: string[], error?: string }>}
 */
async function screenshot(options) {
  const {
    urls,
    outputDir,
    width = 1600,
    height = 800,
    autoscroll = true,
    timeout = 120000,
    qmdPath,
    caption,
  } = options;

  const captured = [];
  const warnings = [];

  let browser;
  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width, height },
    });
    const page = await context.newPage();

    fs.mkdirSync(outputDir, { recursive: true });

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout });
        await page.waitForTimeout(2000);

        if (autoscroll) {
          const scrollY = await findScrollY(page);
          if (scrollY > 0) {
            await page.evaluate((value) => window.scrollTo({ top: value }), scrollY);
            await page.waitForTimeout(700);
          }
        }

        // Derive slug from page title, falling back to URL path
        const pageTitle = await page.title();
        let slugSource = pageTitle;
        if (!slugSource || !slugSource.trim()) {
          try {
            const urlObj = new URL(url);
            slugSource = urlObj.pathname;
          } catch {
            slugSource = url;
          }
        }
        const slug = generateSlug(slugSource);
        const filename = `report-${slug}.png`;
        const filepath = path.resolve(outputDir, filename);

        await page.screenshot({ path: filepath });

        captured.push({ url, filename, filepath, slug });
      } catch (err) {
        const msg = `Failed to capture ${url}: ${err.message}`;
        console.warn(msg);
        warnings.push(msg);
      }
    }

    await browser.close();
    browser = null;
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return {
      success: false,
      captured,
      warnings,
      error: err.message,
    };
  }

  // Insert slides into QMD if path provided and we captured images
  if (qmdPath && captured.length > 0) {
    try {
      insertSlides({ qmdPath, images: captured, caption });
    } catch (err) {
      warnings.push(`Slide insertion failed: ${err.message}`);
    }
  }

  return {
    success: true,
    captured,
    warnings,
  };
}

module.exports = { generateSlug, findScrollY, screenshot };
