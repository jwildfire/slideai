'use strict';

const { scaffold } = require('./scaffold.js');
const { screenshot } = require('./screenshot.js');
const { renderHtml, renderPdf } = require('./render.js');
const { watch } = require('./watch.js');

module.exports = { scaffold, screenshot, renderHtml, renderPdf, watch };
