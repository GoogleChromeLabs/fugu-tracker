module.exports = function (eleventy) {
  return {
    dir: {
      input: 'views',
      output: 'public',
      includes: 'templates/includes',
      layouts: 'templates/layouts',
      data: '../data',
    },
    dataTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateEngineOverride: 'njk',
  };
};
