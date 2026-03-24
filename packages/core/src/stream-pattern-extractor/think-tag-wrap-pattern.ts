import { getPartialStartRegString } from "./common";
export class ThinkTagWrapPattern {
  protected thinkStartFlag: string = '<think>';
  protected thinkEndFlag: string = '</think>';
  protected startRegex: RegExp = new RegExp(`${this.thinkStartFlag}`);
  protected endRegex: RegExp = new RegExp(`${this.thinkEndFlag}`);
  protected partialStartRegex: RegExp = new RegExp(`${getPartialStartRegString(this.thinkStartFlag)}$`);
  protected partialEndRegex: RegExp = new RegExp(`${getPartialStartRegString(this.thinkEndFlag)}$`);

  get regExpMap() {
    return {
      start: {
        full: this.startRegex,
        partial: this.partialStartRegex,
      },
      end: {
        full: this.endRegex,
        partial: this.partialEndRegex,
      },
    }
  }
}
