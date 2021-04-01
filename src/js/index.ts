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

  const cardSelector = window.view === 'timeline' ? '.card__holder' : '.card';

  const nodes = [...document.querySelectorAll(cardSelector)] as Array<HTMLElement>;
  const cards = nodes.map((elem: HTMLElement) => {
    const card = {
      elem,
      title: elem.dataset.title,
      shipping: JSON.parse(elem.dataset.shipping),
      desc: elem.querySelector('.card--summary')
        ? elem.querySelector('.card--summary').textContent
        : '',
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Registration successful, scope is:', registration.scope);
    } catch (e) {
      console.error('Service worker registration failed; error:', e);
    }
  });
}
