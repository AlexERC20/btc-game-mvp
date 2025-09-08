export type Slide = {
  body?: string;     // текст только этого слайда
  image?: string;    // dataURL/URL выбранной фотки
};

export type PhotoMeta = {
  id: string;
  url: string;
};

export type Theme = 'photo' | 'light' | 'dark';

export type LayoutOptions = {
  textPosition: 'bottom' | 'top';
  textSize: number;
  lineHeight: number;
  color: string;
};

export type { CanvasMode } from './core/constants';
