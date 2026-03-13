'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Build the Quarto render command string for the given options.
 *
 * @param {{ qmdPath: string, format: 'html' | 'pdf', output?: string }} options
 * @returns {string} The full command string
 */
function buildCommand(options) {
  const { qmdPath, format, output } = options;
  const formatFlag = format === 'html' ? 'revealjs' : 'pdf';
  let cmd = `quarto render ${qmdPath} --to ${formatFlag}`;
  if (output) {
    cmd += ` --output ${output}`;
  }
  return cmd;
}

/**
 * Check if Quarto CLI is available on the system PATH.
 *
 * @returns {boolean}
 */
function isQuartoAvailable() {
  try {
    const cmd = process.platform === 'win32' ? 'where quarto' : 'which quarto';
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Render a QMD file using Quarto.
 *
 * @param {{ qmdPath: string, format: 'html' | 'pdf', output?: string }} options
 * @returns {{ success: boolean, outputPath: string, error?: string }}
 */
function render(options) {
  const { qmdPath, format, output } = options;

  // Validate QMD file exists
  if (!fs.existsSync(qmdPath)) {
    return {
      success: false,
      outputPath: '',
      error: `File not found: ${qmdPath}`,
    };
  }

  // Check Quarto availability
  if (!isQuartoAvailable()) {
    return {
      success: false,
      outputPath: '',
      error: 'Quarto CLI not found. Please install Quarto: https://quarto.org/docs/get-started/',
    };
  }

  // Build and execute the command
  const cmd = buildCommand(options);
  try {
    execSync(cmd, { stdio: 'pipe' });

    // Determine output path
    let outputPath;
    if (output) {
      outputPath = path.resolve(path.dirname(qmdPath), output);
    } else {
      const ext = format === 'html' ? '.html' : '.pdf';
      const base = path.basename(qmdPath, path.extname(qmdPath));
      outputPath = path.resolve(path.dirname(qmdPath), base + ext);
    }

    return { success: true, outputPath };
  } catch (err) {
    return {
      success: false,
      outputPath: '',
      error: err.message,
    };
  }
}

/**
 * Render a QMD file to HTML (RevealJS).
 *
 * @param {{ qmdPath: string, output?: string }} options
 * @returns {{ success: boolean, outputPath: string, error?: string }}
 */
function renderHtml(options) {
  return render({ ...options, format: 'html' });
}

/**
 * Render a QMD file to PDF.
 *
 * @param {{ qmdPath: string, output?: string }} options
 * @returns {{ success: boolean, outputPath: string, error?: string }}
 */
function renderPdf(options) {
  return render({ ...options, format: 'pdf' });
}

module.exports = { renderHtml, renderPdf, buildCommand, render };
