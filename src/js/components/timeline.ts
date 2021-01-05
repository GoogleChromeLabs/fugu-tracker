declare global {
  interface Window {
    timeline: {
      items: number;
      scoot: number;
    };
  }
}

/**
 * Timeline JS
 */
export class Timeline {
  timeline: HTMLElement;
  items: number;
  scoot: number;
  width: number;
  step: number;
  offset: number;
  /**
   * Builds a timeline view
   * @param {HTMLElement} timeline
   * @param {HTMLElement} releases
   */
  constructor(timeline: HTMLElement) {
    this.timeline = timeline;
    this.items = window.timeline.items;
    this.scoot = window.timeline.scoot;
    this.width = timeline.scrollWidth;
    this.step = this.width / this.items;

    timeline.scrollTo((this.scoot - 1) * this.step, 0);
    this.offset = this.timeline.scrollLeft / this.width;

    this.timeline.addEventListener('scroll', () => {
      this.offset = this.timeline.scrollLeft / this.timeline.scrollWidth;
    });

    window.addEventListener('resize', () => {
      this.timeline.scrollTo(this.timeline.scrollWidth * this.offset, 0);
    });
  }
}
