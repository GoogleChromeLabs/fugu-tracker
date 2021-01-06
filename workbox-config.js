const { version } = require('./package.json');

/**
 * Removes revision IDs from injection as they're not needed for this usecase.
 * @param {ManifestEntries} entries - Manifest entries
 * @return {object}
 */
async function removeRevisionTransform(entries) {
  const manifest = entries.map((entry) => {
    entry.revision = version;
    return entry;
  });
  return { manifest, warnings: [] };
}

module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.css', '**/*.js', '**/*.html', '**/import-map.json', '**/*.svg', 'images/favicon.png'],
  globIgnores: ['web_modules/workbox-recipes.js'],
  swDest: 'dist/sw.js',
  swSrc: 'dist/sw.js',
  manifestTransforms: [removeRevisionTransform],
};
