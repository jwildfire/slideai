#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { scaffold, screenshot, renderHtml, renderPdf, watch } = require('../lib/index.js');

/**
 * Parse process.argv into a subcommand and flags object.
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  let subcommand = null;
  const positional = [];
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--no-autoscroll') {
      flags.autoscroll = false;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!subcommand) {
      subcommand = arg;
    } else {
      positional.push(arg);
    }
  }

  return { subcommand, positional, flags };
}

async function main() {
  const { subcommand, positional, flags } = parseArgs(process.argv);

  if (!subcommand) {
    console.error('Usage: slideai <command> [options]');
    console.error('Commands: new, screenshot, html, pdf, watch');
    process.exit(1);
  }

  let result;

  switch (subcommand) {
    case 'new': {
      const name = positional[0];
      if (!name) {
        console.error('Usage: slideai new <name> [--template <name>] [--outline <text>] [--output <path>]');
        process.exit(1);
      }
      result = scaffold({
        name,
        template: flags.template,
        outline: flags.outline,
        outputPath: flags.output,
      });
      if (result.success) {
        console.log(`Created deck at ${result.outputPath}`);
        console.log(`Files: ${result.files.length}`);
      }
      break;
    }

    case 'screenshot': {
      let urls = positional;
      if (flags.input) {
        const raw = fs.readFileSync(flags.input, 'utf8');
        urls = JSON.parse(raw);
      }
      if (!urls.length) {
        console.error('Usage: slideai screenshot <url...> [--input <file>] [--width <n>] [--height <n>] [--no-autoscroll] [--output <dir>]');
        process.exit(1);
      }
      const opts = {
        urls,
        outputDir: flags.output || path.resolve('images'),
        autoscroll: flags.autoscroll !== false,
      };
      if (flags.width) opts.width = parseInt(flags.width, 10);
      if (flags.height) opts.height = parseInt(flags.height, 10);
      result = await screenshot(opts);
      if (result.success) {
        console.log(`Captured ${result.captured.length} screenshot(s)`);
        if (result.warnings.length) {
          result.warnings.forEach(w => console.warn(w));
        }
      }
      break;
    }

    case 'html': {
      const qmdPath = positional[0] || 'index.qmd';
      result = renderHtml({ qmdPath, output: flags.output });
      if (result.success) {
        console.log(`Rendered HTML: ${result.outputPath}`);
      }
      break;
    }

    case 'pdf': {
      const qmdPath = positional[0] || 'index.qmd';
      result = renderPdf({ qmdPath, output: flags.output });
      if (result.success) {
        console.log(`Rendered PDF: ${result.outputPath}`);
      }
      break;
    }

    case 'watch': {
      const qmdPath = positional[0] || 'index.qmd';
      const handle = watch({ qmdPath });
      console.log(`Watching ${qmdPath} for changes... (Ctrl+C to stop)`);
      process.on('SIGINT', () => {
        handle.stop();
        process.exit(0);
      });
      // Keep process alive
      return;
    }

    default:
      console.error(`Unknown command: ${subcommand}`);
      console.error('Commands: new, screenshot, html, pdf, watch');
      process.exit(1);
  }

  // Handle failure for non-watch commands
  if (result && !result.success) {
    console.error(result.error || 'Unknown error');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
