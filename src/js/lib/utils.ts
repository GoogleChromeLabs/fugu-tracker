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
import { pushCardState } from './routing';

/**
 * Toggles opening and closing of card details
 * @param {HTMLElement} target - An element within the clicked card
 */
export function toggleCardDetails(target: HTMLElement): void {
  const card = target.closest('.card');
  const details = card.querySelector('.card--body') as HTMLElement;
  const info = card.querySelector('.card--more:not(.card--title)') as HTMLElement;
  if (info.dataset.open) {
    delete info.dataset.open;
    delete details.dataset.open;
  } else {
    info.dataset.open = 'true';
    details.dataset.open = 'true';
    pushCardState(card.getAttribute('id'));
  }
}

/**
 * Copies a URL to the clipboard
 * @param {Event} e - Click event
 */
export function copyURL(e: Event): void {
  const t = e.target as HTMLElement;
  const target = t.closest('.copy') as HTMLElement;
  const url = target.dataset.url;
  const temp = document.createElement('input');
  document.body.appendChild(temp);
  temp.value = url;
  temp.select();
  document.execCommand('copy');
  temp.parentNode.removeChild(temp);
}

/**
 * Makes release dates human-readable
 * @param {NodeListOf<HTMLElement>} releases - Releases
 */
export function readableDate(releases: NodeListOf<HTMLElement>): void {
  const today = new Date();

  for (const release of releases) {
    const d = new Date(release.dataset.date);
    const diff = Math.ceil((Number(d) - Number(today)) / (1000 * 60 * 60 * 24));
    const short = d.toLocaleDateString('en-us', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (diff < 0) {
      release.innerHTML = `Stable ${Math.abs(diff).toLocaleString()} days ago <br/>(${short})`;
    } else {
      release.innerHTML = `Stable in ${Math.abs(diff).toLocaleString()} days <br/>(${short})`;
    }
  }
}
