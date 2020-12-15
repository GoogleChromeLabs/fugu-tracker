const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

module.exports = function (eleventy) {
  eleventy.addPassthroughCopy('images');
  eleventy.addPassthroughCopy('favicon.png');
  eleventy.addFilter('date', (d) => new Date(d).toLocaleDateString('en-us', { year: 'numeric', month: 'long', day: 'numeric' }));

  eleventy.addFilter('md', (copy) => md.render(copy));

  eleventy.addFilter('timelineRows', (rows) =>
    Object.keys(rows)
      .reduce((acc, cur) => {
        acc = acc.concat(rows[cur]);
        return acc;
      }, [])
      .filter((row) => row.shipping),
  );

  eleventy.addFilter('shippedString', (api, versions) => {
    if (api.shipping.ship > versions.stable) {
      return 'Expected to ship';
    }

    return 'Shipped';
  });

  eleventy.addFilter('buildBackgroundGradient', (releases, versions) => {
    const total = releases.length;
    const percent = 100 / total;
    const gradients = {
      stable: releases.findIndex((r) => r.release === versions.stable),
      beta: releases.findIndex((r) => r.release === versions.beta),
      dev: releases.findIndex((r) => r.release === versions.dev),
    };

    const gradient = [];
    for (const [name, grd] of Object.entries(gradients)) {
      gradient.push(`linear-gradient(to right, transparent, transparent ${percent * grd}%, var(--${name}-highlight) ${percent * grd}%, var(--${name}-highlight) ${percent * grd + percent}%, transparent ${percent * grd + percent}%)`);
    }
    gradient.push('linear-gradient(to right, var(--timeline-color), var(--timeline-color) 50%, var(--timeline-color-alt) 50%)');
    return gradient.join(', ');
  });

  eleventy.addFilter('calculatedSize', (releases, multiplier = 1) => {
    return `${(100 / releases.length) * multiplier}%`;
  });

  eleventy.addFilter('timelinePosition', (api, releases) => {
    const start = api.shipping?.dev || api.shipping?.ot?.start || api.shipping.ship;
    const end = api.shipping.ship || api.shipping?.ot?.end || api.shipping.ot?.start || api.shipping?.dev;

    const indexes = {
      start: releases.findIndex((r) => r.release === start),
      end: releases.findIndex((r) => r.release === end),
    };

    const span = indexes.end - indexes.start + 1;

    return `grid-column: ${indexes.start + 1} / -1`;
  });

  eleventy.addFilter('timelineGrid', (api, versions) => {
    const start = api.shipping?.dev || api.shipping?.ot?.start || api.shipping.ship;

    return `grid-template-columns: repeat(${versions.max - start}, 25vw)`;
  });

  eleventy.addFilter('timelineGridItem', (api, versions, type) => {
    const start = api.shipping?.dev || api.shipping?.ot?.start || api.shipping.ship;

    const items = {
      dev: {
        min: api.shipping?.dev,
        max: api.shipping?.ot?.start - 1 || api.shipping?.ship - 1 || versions.max,
      },
      get ot() {
        return {
          min: api.shipping?.ot.start || this.dev.max,
          max: api.shipping?.ot?.end || api.shipping?.ship - 1 || versions.max,
        };
      },
      get ship() {
        return {
          min: api.shipping?.ship,
          max: versions.max,
        };
      },
    };
    if (type === 'dev') {
      return `grid-column: ${items.dev.min - start + 1} / span ${items.dev.max - items.dev.min}`;
    } else if (type === 'ot') {
      return `grid-column: ${items.ot.min - start + 1} / span ${items.ot.max - items.ot.min}`;
    } else if (type === 'ship') {
      return `grid-column: ${items.ship.min - start + 1} / -1`;
    }

    // if (type === 'dev') {
    //   const max = api.shipping?.ot?.start || api.shipping?.ship || versions.max;
    //   const min = api.shipping?.dev;

    //   console.log(min);
    //   console.log(max);

    //   //   if (max === versions.max) {
    //   //     return `grid-column: 1 / -1`;
    //   //   } else {
    //   //     return `grid-column: 1 / ${max}`;
    //   //   }
    // }
    // const start = api.shipping?.dev || api.shipping?.ot?.start || api.shipping.ship;

    // console.log(type);

    return '';
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
