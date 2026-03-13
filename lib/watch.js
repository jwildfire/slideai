'use strict';

const path = require('path');
const chokidar = require('chokidar');
const { renderHtml } = require('./render.js');

/**
 * Create a debounced handler that collapses rapid calls into one invocation.
 * The callback fires at most once per `debounceMs` window after the last call.
 *
 * @param {Function} callback - The function to debounce
 * @param {number} debounceMs - Debounce window in milliseconds
 * @returns {Function} Debounced function
 */
function createDebouncedHandler(callback, debounceMs) {
  let timer = null;
  return function debounced() {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, debounceMs);
  };
}

/**
 * Watch a QMD file and its associated assets for changes, re-rendering to HTML
 * on each detected change (debounced).
 *
 * @param {{ qmdPath: string, debounceMs?: number }} options
 * @returns {{ stop: () => void }} WatchHandle
 */
function watch(options) {
  const { qmdPath, debounceMs = 500 } = options;
  const dir = path.dirname(path.resolve(qmdPath));

  const watchPaths = [
    path.resolve(qmdPath),
    path.join(dir, 'styles.css'),
    path.join(dir, 'images'),
  ];

  const debouncedRender = createDebouncedHandler(() => {
    try {
      const result = renderHtml({ qmdPath });
      if (!result.success) {
        console.error(`[slideai watch] Render failed: ${result.error}`);
      }
    } catch (err) {
      console.error(`[slideai watch] Render error: ${err.message}`);
    }
  }, debounceMs);

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on('change', debouncedRender);
  watcher.on('add', debouncedRender);
  watcher.on('unlink', debouncedRender);

  return {
    stop() {
      watcher.close();
    },
  };
}

module.exports = { watch, createDebouncedHandler };
