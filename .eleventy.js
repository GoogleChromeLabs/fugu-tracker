module.exports = function (eleventy) {
  eleventy.addPassthroughCopy('images');

  eleventy.addFilter('origin', (v) => {
    if (v.includes(' ')) {
      const items = v.split(' ').filter((i) => i.startsWith('http://') || i.startsWith('https://'));

      if (items.length) {
        return items.map((i) => ({
          url: i,
          origin: new URL(items[0]).origin,
        }));
      }
    } else {
      try {
        return [
          {
            uri: v,
            origin: new URL(v).origin,
          },
        ];
      } catch (e) {
        return [];
      }
    }

    return [];
  });

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
