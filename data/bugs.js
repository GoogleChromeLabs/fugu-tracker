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
/* eslint-env browser, node */
const puppeteer = require('puppeteer');
const Spinner = require('cli-spinner').Spinner;
const get = require('lodash.get');
const mkdir = require('mkdirp');
const { writeFile: write, readFile: read } = require('fs').promises;
const { existsSync: exists } = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '../public/js');
const outputFile = path.join(jsDir, 'data.json');

/**
 * Cleans up resource list from Chrome Status
 *
 * Resources are used somewhat flexibly, as free-form entry fields, and they sometimes contains
 * unusable information when trying to grab the URLs they are pointing to (and in some cases, may
 * not be URLs at all). This function cleans up the list of resources to make sure what's returned
 * is only a list of URLs.
 * @param {string[]} d - Documents to filter
 * @return {string[]}
 */
function filterResourceURLs(d) {
  // If there's a space in the entry, find only the substrings that are links
  if (d.includes(' ')) {
    const items = d.split(' ').filter((i) => i.startsWith('http://') || i.startsWith('https://'));

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
          url: d,
          origin: new URL(d).origin,
        },
      ];
    } catch (e) {
      return [];
    }
  }

  return [];
}

module.exports = async function () {
  // Use an existing output file if one exists instead of recompiling as it's costly to do so
  if (exists(outputFile)) {
    return JSON.parse(await read(outputFile, 'utf-8'));
  }

  const spinner = new Spinner('%s Downloading data');
  spinner.setSpinnerString(2);
  spinner.start();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // ////////////////////////////
  // Get specific Chromium milestone versions
  //
  // Stable, beta, and dev
  // Min and max used as endpoints for timeline view
  // ////////////////////////////
  spinner.setSpinnerTitle('Downloading Chrome version data');

  await page.goto('https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=-1&n=3', {
    waitUntil: 'networkidle0',
  });
  const versions = await page.evaluate(() => {
    const { mstones } = JSON.parse(document.querySelector('body').innerText);
    return {
      stable: mstones[0].mstone,
      min: mstones[0].mstone,
      beta: mstones[1].mstone,
      dev: mstones[2].mstone,
      max: mstones[2].mstone,
    };
  });

  // ////////////////////////////
  // Get Origin Trail information
  //
  // Gets all active Origin Trial information
  // ////////////////////////////
  spinner.setSpinnerTitle('Downloading Origin Trial info');
  let trials = [];
  // We need to pick off a specific request, so we set up the listener before going to the page.
  page.on('requestfinished', async (request) => {
    if (request.url().startsWith('https://content-chromeorigintrials-pa.googleapis.com/v')) {
      const response = await (await request.response()).buffer();
      trials = JSON.parse(response.toString()).trials;
    }
  });
  await page.goto('https://developers.chrome.com/origintrials/#/trials/active', {
    waitUntil: 'networkidle2',
  });

  // ////////////////////////////
  // Get Chrome Status feature information
  // ////////////////////////////
  spinner.setSpinnerTitle('Downloading feature statuses');
  await page.goto('https://chromestatus.com/features', {
    waitUntil: 'networkidle0',
  });
  const features = await page.evaluate(
    async () => await fetch('/features_v2.json').then((i) => i.json()),
  );

  // ////////////////////////////
  // Get Fugu bugs from the bug tracker
  //
  // Get all bugs from the Fugu API tracker.
  // ////////////////////////////
  spinner.setSpinnerTitle('Downloading Fugu bugs');
  let issues = [];
  // We need to pick off a specific request, so we set up the listener before going to the page.
  page.on('requestfinished', async (request) => {
    if (request.url().startsWith('https://bugs.chromium.org/prpc/monorail.Issues/ListIssues')) {
      const response = await (await request.response()).buffer();
      issues = JSON.parse(response.toString().slice(4)).issues;
    }
  });
  await page.goto(
    'https://bugs.chromium.org/p/chromium/issues/list?sort=pri&colspec=ID%20Target%20M%20Component%20Status%20Owner%20Summary%20OS%20Modified%20Stars%20DevTrial%20OriginTrial%20OriginTrialEnd&num=1000&q=proj%3Dfugu%20-Type%3DFLT-Launch%20-Proj%3Dfugu-efforts%20-Restrict%3DView-Google&can=1',
    { waitUntil: 'networkidle0' },
  );

  // We know what platforms we want to display ahead of time, so set them here
  const platforms = ['Linux', 'Windows', 'Chrome OS', 'Mac', 'Android'];

  const rows = issues
    .filter((i) => !['Duplicate', 'WontFix', 'Archived'].includes(i.statusRef.status))
    .map((i) => {
      // This is the relative shape of the final result, not accounting for Chrome Status and Origin Trial information
      const result = {
        id: i.localId || false,
        status: i.statusRef.status || false,
        stars: i.starCount || false,
        updated: new Date(i.modifiedTimestamp * 1000) || false,
        created: new Date(i.openedTimestamp * 1000) || false,
        owner: false,
        title: false,
        shipping: false,
        who: false,
        where: false,
        pwa: false,
      };

      // Determine owner
      const owner = RegExp(/\w*\.*@(\w*)\.\w*/).exec(i?.ownerRef?.displayName || '');
      result.owner = owner
        ? owner[1] === 'chromium'
          ? 'Google'
          : owner[1].charAt(0).toUpperCase() + owner[1].slice(1)
        : false;

      // Determine shipping information from labels
      const shipping = {};

      for (const label of i.labelRefs) {
        const l = label.label;
        if (l.startsWith('DevTrial-')) {
          shipping.dev = Number(l.replace('DevTrial-', ''));
        }
        if (l.startsWith('OriginTrial-')) {
          shipping.ot = shipping.ot || {};
          shipping.ot.start = Number(l.replace('OriginTrial-', ''));
        }
        if (l.startsWith('OriginTrialEnd-')) {
          shipping.ot = shipping.ot || {};
          shipping.ot.end = Number(l.replace('OriginTrialEnd-', ''));
        }
        if (l.startsWith('M-')) {
          shipping.ship = Number(l.replace('M-', ''));
        }
        if (l.startsWith('Target-') && !('ship' in shipping)) {
          shipping.ship = Number(l.replace('Target-', ''));
        }
      }

      if (Object.keys(shipping).length) {
        result.shipping = shipping;
      }

      // Determine where the feature is available
      let where = [];

      for (const field of i.fieldValues) {
        if (field.fieldRef.fieldName === 'OS') {
          if (field.value === 'All') {
            where = [...platforms];
          } else if (field.value === 'Chrome' && !where.includes('Chrome OS')) {
            where.push('Chrome OS');
          } else if (!['Fuchsia', 'iOS'].includes(field.value) && !where.includes(field.value)) {
            where.push(field.value);
          }
        }
      }

      if (where.length) {
        result.where = where;
      }

      // Determine if it's PWA related
      let pwa = false;
      if (i.componentRefs) {
        for (const component of i.componentRefs) {
          if (component.path.includes('WebAppInstalls')) {
            pwa = true;
            break;
          }
        }
      }

      if (pwa === true) {
        result.pwa = pwa;
      }

      // Determine if it has a Chrome Status feature entry, and update as needed
      const feature = features.find((f) => get(f, 'browsers.chrome.bug', '').includes(result.id));
      let docs = [];
      let demos = [];

      if (feature && feature.resources) {
        // Determine if there are docs
        if (feature.resources.docs) {
          docs = feature.resources.docs
            .map(filterResourceURLs)
            .reduce((acc, cur) => acc.concat(cur), [])
            .filter((d) => d.origin !== 'https://docs.google.com' && d.origin !== 'https://bit.ly');
        }
        // Determine if there are demos
        if (feature.resources.samples) {
          demos = feature.resources.samples
            .map(filterResourceURLs)
            .reduce((acc, cur) => acc.concat(cur), [])
            .filter((d) => d.origin !== 'https://docs.google.com' && d.origin !== 'https://bit.ly');
        }
      }

      if (feature) {
        result.feature = {
          browsers: feature.browsers,
          id: feature.id,
        };
      }

      result.docs = docs;
      result.demos = demos;
      result.title = feature?.name || i.summary || false;
      result.summary = feature?.summary || false;

      // Determine if it has an Origin Trial entry, and update as needed
      const ot = feature?.id
        ? trials.find((t) => t.chromestatusUrl && t.chromestatusUrl.includes(feature.id))
        : false;

      if (ot) {
        result.shipping.ot = {
          start: Number(ot.startMilestone),
          end: Number(ot.endMilestone),
        };
        result.ot = {
          feedback: ot?.feedbackUrl || false,
          id: ot.id,
          status: ot?.status || false,
        };
      }

      if (result.shipping.ot && !result.shipping.ot.end) {
        result.shipping.ot.end = result.shipping.ot.start + 2;
      }

      // Determine min and max versions
      if (result.shipping) {
        const max =
          result.shipping?.ship ||
          result.shipping?.ot?.end ||
          result.shipping?.ot?.start ||
          result.shipping?.dev ||
          versions.stable;
        const min =
          result.shipping?.dev ||
          result.shipping?.ot?.start ||
          result.shipping?.ship ||
          versions.stable;

        if (min < versions.min) {
          versions.min = min;
        }
        if (max > versions.max) {
          versions.max = max;
        }
      }

      return result;
    })
    .reduce(
      (acc, cur) => {
        // Reduce to an object of arrays for each shipping status
        if (cur.shipping.ship && cur.shipping.ship <= versions.stable) {
          // Currently Shipping
          acc.shipped.push(cur);
          acc.shipped = acc.shipped.sort((a, b) => (a.shipping.ship > b.shipping.ship ? 1 : -1));
        } else if (cur.shipping.ot && cur.shipping.ot.start <= versions.stable) {
          // Shipping in OT
          acc.ot.push(cur);
          acc.ot = acc.ot.sort((a, b) => (a.shipping.ot.start > b.shipping.ot.start ? 1 : -1));
        } else if (cur.shipping.dev) {
          // Shipping in Dev
          acc.dev.push(cur);
          acc.dev = acc.dev.sort((a, b) => (a.shipping.dev > b.shipping.dev ? 1 : -1));
        } else if (cur.status === 'Started') {
          // Started, but not yet shipping
          acc.started.push(cur);
          acc.started = acc.started.sort((a, b) =>
            a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1,
          );

          // } else if (cur.status === 'Assigned') {
          // Assigned, but not yet shipping
          //   acc.assigned.push(cur);
          //   acc.assigned = acc.assigned.sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
        } else {
          // Under Consideration
          acc.consideration.push(cur);
          acc.consideration = acc.consideration.sort((a, b) =>
            a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1,
          );
        }
        return acc;
      },
      {
        shipped: [],
        ot: [],
        dev: [],
        started: [],
        assigned: [],
        consideration: [],
      },
    );

  spinner.setSpinnerTitle('Downloading Chrome releases');

  // ////////////////////////////
  // Get release information for min-max versions of Chromium
  // ////////////////////////////
  await page.goto(
    `https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=${
      versions.min - versions.stable
    }&n=${versions.max - versions.min}`,
    {
      waitUntil: 'networkidle2',
    },
  );

  const releases = await page.evaluate(() => {
    const { mstones } = JSON.parse(document.querySelector('body').innerText);
    return mstones.map((m) => ({
      release: m.mstone,
      date: m.stable_date,
    }));
  });

  // Close Puppeteer
  await browser.close();
  spinner.setSpinnerTitle('Finishing up');

  // ////////////////////////////
  // Output data.json file
  // ////////////////////////////
  if (!exists(jsDir)) {
    await mkdir(jsDir);
  }

  platforms.push('PWA');

  await write(
    outputFile,
    JSON.stringify({
      versions,
      releases,
      rows,
      platforms,
    }),
  );
  spinner.stop(true);

  return {
    versions,
    releases,
    platforms,
    rows,
  };
};
