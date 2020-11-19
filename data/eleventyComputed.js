const { statSync } = require('fs');
const path = require('path');

module.exports = {
  versions: (data) => data.bugs.versions,
  releases: (data) => data.bugs.releases,
  apis: (data) => data.bugs.rows,
  platforms: (data) => data.bugs.platforms.sort(),
  dataSize: (data) => {
    const f = path.join(__dirname, '../public/js/data.json');
    const stat = statSync(f);
    return Math.round(stat.size * 0.001);
  },
  sections: () => ({
    shipped: 'Shipped',
    ot: 'Origin Trial (<a href="https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md">details</a>)',
    dev: 'Developer Trial - behind a flag (<a href="https://web.dev/fugu-status/#flag">details</a>)',
    started: 'Started',
    assigned: 'Assigned',
    consideration: 'Under Consideration (star and comment the bug)',
  }),
};
