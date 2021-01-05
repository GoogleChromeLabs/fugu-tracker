/**
 * Toggles opening and closing of card details
 * @param {Event} e - Click event
 */
export function toggleCardDetails(e: Event): void {
  e.preventDefault();
  const target = e.target as HTMLElement;
  const details = target.closest('.card').querySelector('.card--body') as HTMLElement;
  const info = target.closest('.card').querySelector('.card--more:not(.card--title)') as HTMLElement;

  if (info.dataset.open) {
    delete info.dataset.open;
    delete details.dataset.open;
  } else {
    info.dataset.open = 'true';
    details.dataset.open = 'true';
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
    const short = d.toLocaleDateString('en-us', { year: 'numeric', month: 'short', day: 'numeric' });

    if (diff < 0) {
      release.innerHTML = `${Math.abs(diff).toLocaleString()} days ago <br/>(${short})`;
    } else {
      release.innerHTML = `In ${diff.toLocaleString()} days <br/>(${short})`;
    }
  }
}
