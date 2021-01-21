/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

module.exports = function (eleventy) {
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
        max: api.shipping?.ot?.start || api.shipping?.ship || versions.max,
      },
      get ot() {
        return {
          min: api.shipping?.ot.start,
          max: api.shipping?.ot?.end,
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
      let from = items.dev.min - start; // Add one to place it on a grid line
      const length = items.dev.max - items.dev.min + from + 1;
      return `grid-column: ${from || 1} / ${length}`;
    } else if (type === 'ot') {
      const from = items.ot.min - start;
      const length = items.ot.max - items.ot.min + from + 1;
      return `grid-column: ${from || 1} / ${length}`;
    } else if (type === 'ship') {
      const from = items.ship.min - start;
      return `grid-column: ${from || 1} / -1`;
    }

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
