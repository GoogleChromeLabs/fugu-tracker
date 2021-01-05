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
 *
 * @param {string[]} d - Documents to filter
 * @return {string[]}
 */
function filterResourceURLs(d) {
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
  if (exists(outputFile)) {
    return JSON.parse(await read(outputFile, 'utf-8'));
  }

  const spinner = new Spinner('%s Downloading data');
  spinner.setSpinnerString(2);
  spinner.start();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

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

  // Get OT info
  spinner.setSpinnerTitle('Downloading Origin Trial info');
  let trials = [];
  page.on('requestfinished', async (request) => {
    if (request.url().startsWith('https://content-chromeorigintrials-pa.googleapis.com/v')) {
      const response = await request.response();
      trials = JSON.parse(await (await response.buffer()).toString()).trials;
    }
  });
  await page.goto('https://developers.chrome.com/origintrials/#/trials/active', {
    waitUntil: 'networkidle2',
  });

  // Get Feature Info
  spinner.setSpinnerTitle('Downloading feature statuses');
  await page.goto('https://chromestatus.com/features', {
    waitUntil: 'networkidle0',
  });
  const features = await page.evaluate(async () => await fetch('/features_v2.json').then((i) => i.json()));

  // log(features.find((f) => f.browsers.chrome.bug.includes('651661')));

  // Get Fugu bugs
  spinner.setSpinnerTitle('Downloading Fugu bugs');
  await page.goto('https://bugs.chromium.org/p/chromium/issues/list?sort=pri&colspec=ID%20Target%20M%20Component%20Status%20Owner%20Summary%20OS%20Modified%20Stars%20DevTrial%20OriginTrial%20OriginTrialEnd&num=1000&q=proj%3Dfugu%20-Type%3DFLT-Launch%20-Proj%3Dfugu-efforts%20-Restrict%3DView-Google&can=1', { waitUntil: 'networkidle0' });

  const content = await page.evaluate(() => {
    const headers = [...document.querySelector('body > mr-app').shadowRoot.querySelector('main > mr-list-page').shadowRoot.querySelector('mr-issue-list').shadowRoot.querySelectorAll('thead mr-dropdown')].map((item) => item.shadowRoot.querySelector('button').innerText.split('\n')[0]);

    const rows = [...document.querySelector('body > mr-app').shadowRoot.querySelector('main > mr-list-page').shadowRoot.querySelector('mr-issue-list').shadowRoot.querySelectorAll('tbody > tr')].map((item) => {
      const columns = [...item.querySelectorAll('td[class]:not(.ignore-navigation)')].map((column) => {
        const text = column.innerText;

        if (text) return text;
        return column.querySelector('mr-issue-link').shadowRoot.querySelector('#bugLink').innerText;
      });

      return columns;
    });

    return {
      headers,
      rows,
    };
  });

  const platforms = [];

  const rows = content.rows
    .map((row) => {
      return row.reduce((acc, cur, i) => {
        const header = content.headers[i].includes('Summary') ? 'Summary' : content.headers[i];
        const rowObj = { [header]: cur };

        if (header === 'OS' && cur !== '----') {
          let where = cur.split(', ').map((i) => (i === 'Chrome' ? 'Chrome OS' : i));
          if (where.includes('All')) {
            where = ['Linux', 'Windows', 'Chrome OS', 'Mac', 'Android'];
          }

          rowObj.Where = Array.isArray(acc.Where) ? acc.Where : [];
          rowObj.Where = rowObj.Where.concat(where.sort());
        }

        if (header === 'Component' && cur.includes('WebAppInstalls')) {
          rowObj.PWA = true;
        }

        if (header === 'Owner') {
          const owner = RegExp(/\w*\.*@(\w*)\.\w*/).exec(cur);
          rowObj[header] = owner ? (owner[1] === 'chromium' ? 'Google' : owner[1].charAt(0).toUpperCase() + owner[1].slice(1)) : cur;
        }

        let release = false;

        if (header === 'DevTrial' && cur !== '----') {
          rowObj.Shipping = acc.Shipping || {};
          rowObj.Shipping.dev = parseInt(cur);
          release = parseInt(cur);
        }

        if (header === 'OriginTrial' && cur !== '----') {
          rowObj.Shipping = acc.Shipping || {};
          rowObj.Shipping.ot = rowObj.Shipping.ot || {};
          rowObj.Shipping.ot.start = parseInt(cur);
          release = parseInt(cur);
        }

        if (header === 'OriginTrialEnd' && cur !== '----') {
          rowObj.Shipping = acc.Shipping || {};
          rowObj.Shipping.ot = rowObj.Shipping.ot || {};
          rowObj.Shipping.ot.end = parseInt(cur);
          release = parseInt(cur);
        }

        if (header === 'M' || header === 'Target') {
          rowObj.Shipping = acc.Shipping || {};
          if (!rowObj.Shipping.ship && cur !== '----') {
            rowObj.Shipping.ship = parseInt(cur);
            release = parseInt(cur);
          }
        }

        return Object.assign(acc, rowObj);
      }, {});
    })
    .filter((i) => i.Status !== 'WontFix' && i.Status !== 'Duplicate' && i.Status !== 'Archived')
    .map((i) => {
      const feature = features.find((f) => get(f, 'browsers.chrome.bug', '').includes(i.ID));
      let docs = [];
      let demos = [];

      if (feature && feature.resources) {
        if (feature.resources.docs) {
          docs = feature.resources.docs
            .map(filterResourceURLs)
            .reduce((acc, cur) => acc.concat(cur), [])
            .filter((i) => i.origin !== 'https://docs.google.com' && i.origin !== 'https://bit.ly');
        }
        if (feature.resources.samples) {
          demos = feature.resources.samples
            .map(filterResourceURLs)
            .reduce((acc, cur) => acc.concat(cur), [])
            .filter((i) => i.origin !== 'https://docs.google.com' && i.origin !== 'https://bit.ly');
        }
      }

      const ot = feature?.id ? trials.find((t) => t.chromestatusUrl && t.chromestatusUrl.includes(feature.id)) : false;

      return {
        who: i.Owner !== '----' ? i.Owner : false,
        where: i.Where || false,
        pwa: i.PWA || false,
        stars: parseInt(i.Stars) || false,
        title: feature?.name || i.Summary || false,
        summary: feature?.summary || false,
        updated: i.Modified || false,
        shipping: Object.keys(i.Shipping).length ? i.Shipping : false,
        status: i.Status || false,
        id: i.ID || false,
        feature,
        docs,
        demos,
        ot,
      };
    })
    .reduce(
      (acc, cur) => {
        if (cur.where) {
          cur.where = cur.where.filter((w) => w !== 'Fuchsia' && w !== 'iOS');
          const pform = cur.pwa ? cur.where.concat(['PWA']) : cur.where;
          for (const p of pform) {
            if (!platforms.includes(p)) {
              platforms.push(p);
            }
          }
        }

        if (cur.ot) {
          cur.shipping.ot = {
            start: parseInt(cur.ot.startMilestone),
            end: parseInt(cur.ot.endMilestone),
          };
          cur.ot = {
            feedback: cur.ot?.feedbackUrl || false,
            feature: cur.ot?.originTrialFeatureName || false,
            name: cur.ot?.displayName || false,
            desc: cur.ot?.description || false,
            id: cur.ot.id,
            status: cur.ot?.status || false,
          };
        }

        if (cur.shipping.ot && !cur.shipping.ot.end) {
          cur.shipping.ot.end = cur.shipping.ot.start + 2;
        }

        if (cur.shipping) {
          const max = cur.shipping?.ship || cur.shipping?.ot?.end || cur.shipping?.ot?.start || cur.shipping?.dev || versions.stable;
          const min = cur.shipping?.dev || cur.shipping?.ot?.start || cur.shipping?.ship || versions.stable;

          if (min < versions.min) {
            versions.min = min;
          }
          if (max > versions.max) {
            versions.max = max;
          }
        }

        if (cur.shipping.ship && cur.shipping.ship <= versions.stable) {
          acc.shipped.push(cur);
          acc.shipped = acc.shipped.sort((a, b) => (a.shipping.ship > b.shipping.ship ? 1 : -1));
        } else if (cur.shipping.ot && cur.shipping.ot.start <= versions.stable) {
          acc.ot.push(cur);
          acc.ot = acc.ot.sort((a, b) => (a.shipping.ot.start > b.shipping.ot.start ? 1 : -1));
        } else if (cur.shipping.dev) {
          acc.dev.push(cur);
          acc.dev = acc.dev.sort((a, b) => (a.shipping.dev > b.shipping.dev ? 1 : -1));
        } else if (cur.status === 'Started') {
          acc.started.push(cur);
          acc.started = acc.started.sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
          // } else if (cur.status === 'Assigned') {
          //   acc.assigned.push(cur);
          //   acc.assigned = acc.assigned.sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
        } else {
          acc.consideration.push(cur);
          acc.consideration = acc.consideration.sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
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

  await page.goto(`https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=${versions.min - versions.stable}&n=${versions.max - versions.min}`, {
    waitUntil: 'networkidle2',
  });

  const releases = await page.evaluate(() => {
    const { mstones } = JSON.parse(document.querySelector('body').innerText);
    return mstones.map((m) => ({
      release: m.mstone,
      date: m.stable_date,
    }));
  });

  await browser.close();
  spinner.setSpinnerTitle('Finishing up');

  if (!exists(jsDir)) {
    await mkdir(jsDir);
  }

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
