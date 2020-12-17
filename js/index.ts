/* global view */
import { Flyout } from './components/flyout';
import { Filter } from './components/filter';
import { toggleCardDetails, copyURL, readableDate } from './lib/utils';

declare global {
  interface Window {
    view: string;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // Set up info and filter flyouts
  const info = document.getElementById('info');
  const filter = document.getElementById('filter');

  const cardSelector = window.view === 'timeline' ? '.card__holder' : 'card';

  const nodes = [...document.querySelectorAll(cardSelector)] as Array<HTMLElement>;
  const cards = nodes.map((elem: HTMLElement) => {
    const card = {
      elem,
      title: elem.dataset.title,
      shipping: JSON.parse(elem.dataset.shipping),
      desc: elem.querySelector('.card--summary') ? elem.querySelector('.card--summary').textContent : '',
      status: elem.dataset.type,
      bug: elem.dataset.bug,
      where: JSON.parse(elem.dataset.where),
      pwa: elem.dataset.pwa === 'true',
    };

    for (const el of elem.querySelectorAll('.card--more')) {
      el.addEventListener('click', toggleCardDetails);
    }
    return card;
  });

  new Flyout(info, info.querySelector('#info-toggle'), 'info');

  new Filter(filter, cards);

  // Set up URL copying
  for (const copy of document.querySelectorAll('.copy')) {
    copy.addEventListener('click', copyURL);
  }

  // Setup timeline
  if (window.view === 'timeline') {
    const { Timeline } = await import('./components/timeline');
    new Timeline(document.getElementById('timeline'));
  }

  // Make release dates more readable
  readableDate(document.querySelectorAll('.release--date'));
});
