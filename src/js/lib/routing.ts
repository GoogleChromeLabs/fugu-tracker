import { toggleCardDetails } from './utils';

/**
 * Pushes the card ID to the history stack. Prevents the page from jumping
 * as it would happen when setting the location.hash.
 * @param {string} id - The ID of the card
 */
export function pushCardState(id: string): void {
  history.pushState({ id }, null, `#${id}`);
}

/**
 * Open the initially selected card and listen for popstate events.
 */
export function registerRouting(): void {
  openCardFromHash();
  window.addEventListener('popstate', (event: PopStateEvent) => restoreState(event));
}

/**
 * Opens the card from the initial ID in the hash (if present).
 */
function openCardFromHash(): void {
  // Open card from hash
  const cardId = location.hash.substr(1); // strip #
  const target = document.getElementById(cardId);
  if (target) {
    toggleCardDetails(target);
  }
}

/**
 * State updated due to change in browser history. Opens the card if necessary
 * and aligns it to the top of the page.
 * @param {PopStateEvent} event
 */
function restoreState(event: PopStateEvent): void {
  const { id } = event.state ?? {};
  if (!id) {
    // State does not contain an ID, skip
    return;
  }

  const target = document.getElementById(id);
  if (!target) {
    // Target not found (i.e., wrong view), skip
    return;
  }

  const info = target.querySelector('.card--more:not(.card--title)') as HTMLElement;
  if (!info.dataset.open) {
    // Card was closed, toggle it to make it visible.
    toggleCardDetails(target);
  }

  // Scroll card into view
  setTimeout(() => target.scrollIntoView(true));
}
