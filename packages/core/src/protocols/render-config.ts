import type { CardSchema } from './schema';

export interface IExample {
  name: string;
  description?: string;
  schema: CardSchema;
}

export interface IRendererConfig {
  materialsList: any[];
  examples: IExample[];
  whiteList: string[];
  wrapperComponent?: string;
}
