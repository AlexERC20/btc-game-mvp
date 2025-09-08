export type SlideId = string;

export type Slide = {
  id: SlideId;
  body: string;                 // текст этого слайда
  title?: string;               // заголовок (опционально)
  image?: string;               // dataURL/URL выбранной фотки
  imageId?: string | null;

  // визуальные пер-слайд настройки (если не задано — берём из defaults)
  overrides?: {
    fontSize?: number;          // px при canvas width=1080
    lineHeight?: number;        // 1.1..1.6
    textPosition?: 'top'|'bottom';
    titleColor?: string;        // css color
    matchTitleToBody?: boolean; // если true — titleColor игнорим и берём body color
  };
};

export type Defaults = {
  fontSize: number;             // общий дефолт, напр. 44
  lineHeight: number;           // напр. 1.28
  textPosition: 'top'|'bottom';
  bodyColor: string;            // цвет основного текста
  titleColor: string;           // дефолтный цвет заголовка
  matchTitleToBody: boolean;    // если true — заголовок = bodyColor
};

export type PhotoMeta = {
  id: string;
  url: string;
};

export type Theme = 'photo' | 'light' | 'dark';

export type { CanvasMode } from './core/constants';
