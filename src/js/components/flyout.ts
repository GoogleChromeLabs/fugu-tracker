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
