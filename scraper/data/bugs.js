const puppeteer = require('puppeteer');
const Spinner = require('cli-spinner').Spinner;
const get = require('lodash.get');
const mkdir = require('mkdirp');
const { writeFile: write, readFile: read } = require('fs').promises;
const { existsSync: exists } = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '../public/js');
const outputFile = path.join(jsDir, 'data.js');

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

  // Get current version info
  await page.goto('https://www.chromestatus.com/features/schedule', {
    waitUntil: 'networkidle0',
  });
  const versions = await page.evaluate(() => {
    return [
      ...document
        .querySelector('#releases-section > chromedash-schedule')
        .shadowRoot.querySelectorAll('.release .chrome_version a'),
    ]
      .map((item) => parseInt(item.innerText.replace('Chrome ', '')))
      .reduce((acc, cur, i) => {
        switch (i) {
          case 0:
            acc.stable = cur;
            acc.min = cur;
            break;
          case 1:
            acc.beta = cur;
            break;
          case 2:
            acc.canary = cur;
            acc.max = cur;
            break;
        }

        return acc;
      }, {});
  });

  // Get Feature Info
  spinner.setSpinnerTitle('Downloading feature statuses');
  await page.goto('https://chromestatus.com/features', {
    waitUntil: 'networkidle0',
  });
  const features = await page.evaluate(
    async () => await fetch('/features_v2.json').then((i) => i.json()),
  );

  // log(features.find((f) => f.browsers.chrome.bug.includes('651661')));

  // Get Fugu bugs
  spinner.setSpinnerTitle('Downloading Fugu bugs');
  await page.goto(
    'https://bugs.chromium.org/p/chromium/issues/list?sort=pri&colspec=ID%20Target%20M%20Component%20Status%20Owner%20Summary%20OS%20Modified%20Stars%20DevTrial%20OriginTrial%20OriginTrialEnd&num=1000&q=proj%3Dfugu%20-Type%3DFLT-Launch%20-Proj%3Dfugu-efforts%20-Restrict%3DView-Google&can=1',
    { waitUntil: 'networkidle0' },
  );

  const content = await page.evaluate(() => {
    const headers = [
      ...document
        .querySelector('body > mr-app')
        .shadowRoot.querySelector('main > mr-list-page')
        .shadowRoot.querySelector('mr-issue-list')
        .shadowRoot.querySelectorAll('thead mr-dropdown'),
    ].map(
      (item) =>
        item.shadowRoot.querySelector('button').innerText.split('\n')[0],
    );

    const rows = [
      ...document
        .querySelector('body > mr-app')
        .shadowRoot.querySelector('main > mr-list-page')
        .shadowRoot.querySelector('mr-issue-list')
        .shadowRoot.querySelectorAll('tbody > tr'),
    ].map((item) => {
      const columns = [
        ...item.querySelectorAll('td[class]:not(.ignore-navigation)'),
      ].map((column) => {
        const text = column.innerText;

        if (text) return text;
        return column
          .querySelector('mr-issue-link')
          .shadowRoot.querySelector('#bugLink').innerText;
      });

      return columns;
    });

    return {
      headers,
      rows,
    };
  });

  const rows = content.rows
    .map((row) => {
      return row.reduce((acc, cur, i) => {
        const header = content.headers[i].includes('Summary')
          ? 'Summary'
          : content.headers[i];
        const rowObj = { [header]: cur };

        if (header === 'OS' && cur !== '----') {
          rowObj.Where = Array.isArray(acc.Where) ? acc.Where : [];
          rowObj.Where = rowObj.Where.concat(cur.split(', '));
        }

        if (header === 'Component' && cur.includes('WebAppInstalls')) {
          rowObj.Where = Array.isArray(acc.Where) ? acc.Where : [];
          rowObj.Where.push('PWA');
        }

        if (header === 'Owner') {
          const owner = RegExp(/\w*\.*@(\w*)\.\w*/).exec(cur);
          rowObj[header] = owner
            ? owner[1] === 'chromium'
              ? 'Google'
              : owner[1].charAt(0).toUpperCase() + owner[1].slice(1)
            : cur;
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

        if (release) {
          if (release > versions.max) {
            versions.max = release;
          } else if (release < versions.min) {
            versions.min = release;
          }
        }

        return Object.assign(acc, rowObj);
      }, {});
    })
    .filter((i) => i.Status !== 'WontFix' && i.Status !== 'Duplicate')
    .map((i) => {
      const feature = features.find((f) =>
        get(f, 'browsers.chrome.bug', '').includes(i.ID),
      );

      return {
        who: i.Owner !== '----' ? i.Owner : false,
        where: i.Where || false,
        stars: parseInt(i.Stars) || false,
        title: feature?.name || i.Summary || false,
        summary: feature?.summary || false,
        updated: i.Modified || false,
        shipping: Object.keys(i.Shipping).length ? i.Shipping : false,
        status: i.Status || false,
        id: i.ID || false,
        feature,
      };
    })
    .reduce(
      (acc, cur) => {
        switch (cur.status) {
          case 'Fixed':
          case 'Verified':
            if (cur.shipping.ship <= versions.stable) {
              acc.shipped.push(cur);
            } else {
              acc.ot.push(cur);
            }
            break;
          case 'Started':
            if (cur.shipping.ot) {
              acc.ot.push(cur);
            } else if (cur.shipping.dev) {
              acc.dev.push(cur);
            } else {
              acc.started.push(cur);
            }
            break;
          case 'Assigned':
            acc.assigned.push(cur);
            break;
          default:
            acc.consideration.push(cur);
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

  // log(rows);

  spinner.setSpinnerTitle('Downloading Chrome releases');
  // console.log('\nGetting Calendar');

  // Get Chrome release info
  await page.goto('https://www.chromium.org/developers/calendar', {
    waitUntil: 'networkidle2',
  });
  // console.log('\nCalendar retrieved');
  const releases = (
    await page.evaluate(() => {
      return [...document.querySelectorAll('table tr td b')]
        .filter((i) => i.innerText.includes('Week of Branch Point'))
        .map((i) => {
          const parent = i.closest('table');
          return [
            ...parent.querySelectorAll('tbody tr:not(:nth-child(1))'),
          ].map((r) => {
            const date = new RegExp(
              /\s*(\w{1,5}\s\d{1,2}(st|nd|rd|th)?,\s\d{4})/,
            ).exec(r.querySelector('td:nth-child(2)').innerText);
            return {
              release: parseInt(r.querySelector('td:nth-child(1)').innerText),
              date: date ? date[1].replace(date[2], '') : false,
            };
          });
        });
    })
  )
    .flat()
    .filter((a) => a.date !== false && a.release >= versions.min)
    .sort((a, b) => {
      if (a.release < b.release) return -1;
      if (a.release > b.release) return 1;
      return 0;
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
    }),
  );
  spinner.stop(true);

  return {
    versions,
    releases,
    rows,
  };
};
