import Fuse from 'fuse.js';
import { Flyout } from './flyout';
import { Card } from '../lib/types';

/**
 * Filter options
 */
interface FilterOptions {
  version?: number;
  search?: string;
  platforms?: Array<string>;
  bug?: string;
}

/**
 * Filter component
 */
export class Filter extends Flyout {
  form: HTMLFormElement;
  cards: Array<Card>;
  fuse: Fuse<Card>;
  /**
   *
   * @param {HTMLElement} filter - Filter to work on
   * @param {Card[]} cards - Array of elements to work on
   */
  constructor(filter: HTMLElement, cards: Array<Card>) {
    super(filter, filter.querySelector('#filter-toggle'), 'filter');

    this.form = filter.querySelector('#filter-form');
    this.cards = cards;
    this.fuse = new Fuse(cards, {
      keys: ['title', 'desc'],
      includeScore: true,
      minMatchCharLength: 2,
      includeMatches: true,
      ignoreLocation: true,
    });

    this.init();
    this.form.addEventListener('submit', this.submitFilter.bind(this));
    this.form.addEventListener('reset', this.resetFilter.bind(this));
  }

  /**
   * Initializes the filter based on query strings
   */
  init(): void {
    const search = new URL(location.toString()).search;

    if (search) {
      const params = new URLSearchParams(search.substring(1));
      const toSearch = {
        version: Number(params.get('version')),
        search: params.get('search'),
        platforms: params.get('platforms') ? JSON.parse(params.get('platforms')) : '',
        bug: params.get('bug'),
      };

      const elements = [...this.form.querySelectorAll('[name]')] as Array<HTMLInputElement>;

      for (const elem of elements) {
        const param = toSearch[elem.name];
        if (param) {
          if (elem.type === 'select-multiple') {
            for (const item of param) {
              const option: HTMLOptionElement = elem.querySelector(`[value="${item}"]`);
              option.selected = true;
            }
          } else {
            elem.value = param;
          }
        }
      }

      this.filterResults(toSearch);
    }
  }

  /**
   * @param {FilterOptions} param0 - Options to filter on
   * @param {number} [param0.version] - Minimum version to filter on
   * @param {string} [param0.search] - Search string to look for
   * @param {string[]} [param0.platforms] - Array of possible platforms it could have launched on
   * @param {string} [param0.bug] - Bug number
   */
  filterResults({ version, search, platforms, bug }: FilterOptions): void {
    const searchParams = new URLSearchParams();
    searchParams.set('version', version);
    searchParams.set('search', search);
    searchParams.set('platforms', JSON.stringify(platforms));
    searchParams.set('bug', bug);

    window.history.pushState('', '', `?${searchParams.toString()}`);

    this.toggle.dataset.active = true;

    const s = this.fuse.search(search).filter((s) => s.score <= 0.25);
    const results = (s.length ? s.map((i) => i.item) : this.cards)
      // Version
      .filter((card: Card) => {
        if (isNaN(Number(version))) return true;

        if (card.status === 'shipped') {
          if (card.shipping === false) return true;
          if (card.shipping?.ship <= version) return true;
        }
        if (card.shipping?.ot?.start <= version) return true;
        if (card.shipping?.dev <= version) return true;

        return false;
      })
      // Platform
      .filter((card) => {
        if (platforms.length === 0) return true;

        let filtered = [];
        if (Array.isArray(card.where)) {
          filtered = filtered.concat(card.where);
        }
        if (card.pwa) {
          filtered.push('pwa');
        }

        return filtered.length >= 0 && filtered.filter((w) => platforms.includes(w.toLocaleLowerCase())).length > 0;
      });

    for (const card of this.cards) {
      let display = false;
      if (results.find((c) => c.bug === card.bug)) {
        display = true;
      }

      if (display) {
        card.elem.style.display = 'block';
      } else {
        card.elem.style.display = 'none';
      }
    }
  }

  /**
   * Filters the current elements
   * @param {Event} e - Form submit event
   */
  submitFilter(e: Event): void {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);

    const version = Number(data.get('version').toString());
    const search = data.get('search').toString();
    const platforms = data.getAll('platforms').map((p) => p.toString().toLocaleLowerCase());
    const bug = data.get('bug').toString();

    this.filterResults({ version, search, platforms, bug });
  }

  /**
   * Resets filter form and related items
   */
  resetFilter(): void {
    for (const card of this.cards) {
      card.elem.style.display = 'block';
    }

    delete this.toggle.dataset.active;

    if (location.search) {
      history.pushState('', '', location.href.replace(location.search, ''));
    }
  }
}
