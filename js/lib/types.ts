export interface Card {
  elem: HTMLElement;
  title: string;
  shipping: {
    ship?: number;
    ot?: {
      start?: number;
      end?: number;
    };
    dev?: number;
  };
  desc: string;
  status: string;
  bug: string;
  where: Array<string>;
  pwa: boolean;
}
