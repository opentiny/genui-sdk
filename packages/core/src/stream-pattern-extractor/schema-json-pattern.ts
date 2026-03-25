import { getPartialStartRegString } from "./common";
export class SchemaJsonPattern {
  protected startFlag: string = '```schemaJson';
  protected startRegex: RegExp = new RegExp(`${this.startFlag}`);
  protected partialStartRegex: RegExp = new RegExp(`${getPartialStartRegString(this.startFlag)}$`);
  protected endFlag: string = '```';
  protected endRegex: RegExp = new RegExp(`\\n\\s*${this.endFlag}`);
  protected partialEndRegex: RegExp = new RegExp(`\\n(\\s*${getPartialStartRegString(this.endFlag)})?$`);

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
