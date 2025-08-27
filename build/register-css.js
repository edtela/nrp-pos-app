// Register CSS file handler for Node.js
// This allows importing CSS files in Node during SSG
require.extensions['.css'] = function (module, filename) {
  module.exports = '';
};