module.exports = function (eleventy) {
  eleventy.addPassthroughCopy('images');
  eleventy.addPassthroughCopy('js');
  eleventy.addFilter('date', (d) => new Date(d).toLocaleDateString('en-us', { year: 'numeric', month: 'long', day: 'numeric' }));

  return {
    dir: {
      input: 'views',
      output: 'public',
      includes: '../templates/includes',
      layouts: '../templates/layouts',
      data: '../data',
    },
    dataTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateEngineOverride: 'njk',
  };
};
