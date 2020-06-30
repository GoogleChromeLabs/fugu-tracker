const puppeteer = require('puppeteer');
const Spinner = require('cli-spinner').Spinner;

module.exports = async function () {
  const spinner = new Spinner('%s Downloading bug data');
  spinner.setSpinnerString(2);
  spinner.start();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    'https://bugs.chromium.org/p/chromium/issues/list?sort=pri&colspec=ID%20Pri%20Target%20M%20Component%20Status%20Owner%20Summary%20OS%20Modified%20Type%20AllLabels%20Stars&num=1000&q=proj%3Dfugu%20-Type%3DFLT-Launch%20-Proj%3Dfugu-efforts%20-Restrict%3DView-Google&can=1',
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
  await browser.close();
  spinner.stop(true);

  return content;
};
