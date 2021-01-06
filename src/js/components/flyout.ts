/**
 * Flyout base class
 */
export class Flyout {
  parent: HTMLElement;
  toggle: HTMLElement;
  _name: string;

  /**
   *
   * @param {HTMLElement} parent - Parent element for the flyout
   * @param {string} name - Name of the type of flyout
   */
  constructor(parent: HTMLElement, name: string) {
    this.parent = parent;
    this.toggle = parent.querySelector('.flyout--toggle');
    this._name = name;

    this.toggle.setAttribute('aria-label', `Open ${this._name}`);
    this.toggle.addEventListener('click', this._toggle.bind(this));
  }

  /**
   * Toggles relevant attributes to make item flyout
   */
  _toggle(): void {
    if (this.parent.dataset.open) {
      this.toggle.setAttribute('aria-label', `Open ${this._name}`);
      delete this.parent.dataset.open;
    } else {
      this.parent.dataset.open = 'true';
      this.toggle.setAttribute('aria-label', `Close ${this._name}`);
    }
  }
}
