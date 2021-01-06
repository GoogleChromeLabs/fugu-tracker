module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.css', '**/*.js', '**/*.html', '**/import-map.json', '**/*.svg', 'images/favicon.png'],
  globIgnores: ['web_modules/workbox-recipes.js'],
  swDest: 'dist/sw.js',
  swSrc: 'dist/sw.js',
};
