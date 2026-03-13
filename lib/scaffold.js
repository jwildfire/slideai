'use strict';

const fs = require('fs');
const path = require('path');
const { parseOutline } = require('./outline.js');
const { writeQmd } = require('./qmd.js');

/**
 * Discover available templates by listing directories in the templates/ folder.
 *
 * @param {string} [templatesDir] - Override path to templates directory (for testing)
 * @returns {string[]} Array of template directory names
 */
function listTemplates(templatesDir) {
  const dir = templatesDir || path.resolve(__dirname, '..', 'templates');
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Create a new slide deck project directory from a template.
 *
 * @param {object} options
 * @param {string} options.name - Deck name (used as directory name and title)
 * @param {string} [options.outputPath] - Output directory path. Default: './slides/<name>'
 * @param {string} [options.template='default'] - Template name
 * @param {string} [options.outline] - Multi-line content outline string
 * @returns {{ success: boolean, outputPath: string, files: string[], error?: string }}
 */
function scaffold(options) {
  const { name, outline } = options;
  const templateName = options.template || 'default';
  const templatesDir = path.resolve(__dirname, '..', 'templates');

  // 1. Discover available templates
  const available = listTemplates(templatesDir);

  // 2. Validate template exists
  const templateDir = path.join(templatesDir, templateName);
  if (!available.includes(templateName)) {
    return {
      success: false,
      outputPath: '',
      files: [],
      error: `Unknown template "${templateName}". Available templates: ${available.join(', ')}`,
    };
  }

  // 3. Resolve output path
  const outputPath = options.outputPath
    ? path.resolve(options.outputPath)
    : path.resolve('slides', name);

  // 4. Validate target directory doesn't exist
  if (fs.existsSync(outputPath)) {
    return {
      success: false,
      outputPath,
      files: [],
      error: `Directory already exists: ${outputPath}`,
    };
  }

  // 5. Create directory structure and copy template files
  const files = [];
  try {
    // Create output dir and images subdir
    fs.mkdirSync(path.join(outputPath, 'images'), { recursive: true });

    // Copy _quarto.yml
    const quartoSrc = path.join(templateDir, '_quarto.yml');
    const quartoDest = path.join(outputPath, '_quarto.yml');
    fs.copyFileSync(quartoSrc, quartoDest);
    files.push(quartoDest);

    // Copy styles.css
    const cssSrc = path.join(templateDir, 'styles.css');
    const cssDest = path.join(outputPath, 'styles.css');
    fs.copyFileSync(cssSrc, cssDest);
    files.push(cssDest);

    // Copy images/placeholder.svg
    const svgSrc = path.join(templateDir, 'images', 'placeholder.svg');
    const svgDest = path.join(outputPath, 'images', 'placeholder.svg');
    fs.copyFileSync(svgSrc, svgDest);
    files.push(svgDest);

    // 6. Generate QMD content
    let qmdContent;
    if (outline) {
      // Parse outline and generate slides from it
      const outlineSlides = parseOutline(outline);
      const slides = [];

      if (outlineSlides.length === 0) {
        // Empty/unparseable outline → single placeholder slide
        slides.push({
          heading: 'Placeholder Slide',
          headingLevel: 2,
          classes: [],
          body: '\nThis is a placeholder content slide. Replace this with your own content.\n\n',
        });
      } else {
        for (const s of outlineSlides) {
          let body = '\n';
          if (s.bullets.length > 0) {
            body += s.bullets.map(b => `- ${b}`).join('\n') + '\n';
          }
          body += '\n';
          slides.push({
            heading: s.heading,
            headingLevel: 2,
            classes: [],
            body,
          });
        }
      }

      const doc = {
        frontMatter: `title: "${name}"\nformat:\n  revealjs:\n    theme: black\n    slide-number: true\n    navigation-mode: linear\n    transition: none\n    css: styles.css\n`,
        slides,
        trailingContent: '',
      };
      qmdContent = writeQmd(doc);
    } else {
      // No outline — read template.qmd and replace {{title}} placeholder
      const templateQmdPath = path.join(templateDir, 'template.qmd');
      let templateQmd = fs.readFileSync(templateQmdPath, 'utf8');
      templateQmd = templateQmd.replace(/\{\{title\}\}/g, name);
      templateQmd = templateQmd.replace(/\{\{subtitle\}\}/g, '');
      templateQmd = templateQmd.replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10));
      qmdContent = templateQmd;
    }

    // Write QMD file
    const qmdDest = path.join(outputPath, 'index.qmd');
    fs.writeFileSync(qmdDest, qmdContent, 'utf8');
    files.push(qmdDest);

    return {
      success: true,
      outputPath,
      files,
    };
  } catch (err) {
    return {
      success: false,
      outputPath,
      files,
      error: err.message,
    };
  }
}

module.exports = { listTemplates, scaffold };
