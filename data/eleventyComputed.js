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
const { statSync } = require('fs');
const path = require('path');

module.exports = {
  versions: (data) => data.bugs.versions,
  releases: (data) => data.bugs.releases,
  apis: (data) => data.bugs.rows,
  platforms: (data) => data.bugs.platforms.sort(),
  dataSize: (data) => {
    const f = path.join(__dirname, '../dist/js/data.json');
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
  intros: (data) => {
    const shared = `The [capabilities project](https://developers.google.com/web/updates/capabilities), also known as Project Fugu, is a cross-company effort to make it possible for web apps to do anything iOS, Android, or desktop apps can, by exposing the capabilities of these platforms to the web while maintaining user security, privacy, trust, and other core tenets of the web.

If you'd like to work with this data programmatically, you can [download it](/js/data.json) (approx. ${data.dataSize}KB)`;

    const footer = `This site was last deployed on **${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}**.`;

    return {
      list: `${shared}

This view shows all of the APIs being considered. To see just the APIs that are available to test with or use in the order they became available, swap to our [timeline view](/timeline). A large screen is recommended.`,
      timeline: `${shared}

This timeline view works best on large screens and only shows the subset of APIs that are available to test. To see all APIs, or if this view doesn't work for your screen size, swap to our [normal view](/).`,
      footer: `### Feedback
* [Suggest a new Fugu capability](https://goo.gl/qWhHXU)
* [Report a bug or request a feature for this tracker](https://github.com/GoogleChromeLabs/fugu-tracker/issues)

If you want to comment on a specific feature, do so using its tracking bug (found by expanding the feature). If something doesn't look right in the tracker, like the date of an API seems wrong, start by filing a bug with the tracker and the team will help determine the cause from there.

${footer}`,
    };
  },
};
