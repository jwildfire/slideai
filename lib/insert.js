'use strict';

const fs = require('fs');
const { parseQmd, writeQmd, appendSlides } = require('./qmd.js');

/**
 * Generate a single full-image-slide QMD slide object for a captured image.
 *
 * @param {object} image - CapturedImage with url, filename, filepath, slug
 * @param {string} [caption] - Optional caption text
 * @returns {{ heading: string, headingLevel: number, classes: string[], body: string }}
 */
function buildSlide(image, caption) {
  const imgLine = `![](images/report-${image.slug}.png){fig-alt="Screenshot of ${image.slug}" width="96%"}`;
  let body = '\n' + imgLine + '\n';
  if (caption) {
    body += '\n<p class="img-caption">' + caption + '</p>\n';
  }
  body += '\n';
  return {
    heading: '',
    headingLevel: 2,
    classes: ['full-image-slide'],
    body,
  };
}

/**
 * Insert full-image slides into a QMD file for each captured image.
 *
 * @param {{ qmdPath: string, images: Array<{ url: string, filename: string, filepath: string, slug: string }>, caption?: string }} options
 * @returns {{ success: boolean, slidesAdded: number, error?: string }}
 */
function insertSlides(options) {
  const { qmdPath, images, caption } = options;

  try {
    const content = fs.readFileSync(qmdPath, 'utf-8');
    const doc = parseQmd(content);

    const newSlides = images.map(img => buildSlide(img, caption));
    const updatedDoc = appendSlides(doc, newSlides);
    const output = writeQmd(updatedDoc);

    fs.writeFileSync(qmdPath, output, 'utf-8');

    return { success: true, slidesAdded: newSlides.length };
  } catch (err) {
    return { success: false, slidesAdded: 0, error: err.message };
  }
}

module.exports = { insertSlides, buildSlide };
