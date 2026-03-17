export class ThinkTagWrapPattern {
  protected thinkStartFlag: string = '<think>';
  protected thinkEndFlag: string = '</think>';
  protected startRegex: RegExp = new RegExp(`${this.thinkStartFlag}`);
  protected endRegex: RegExp = new RegExp(`${this.thinkEndFlag}`);

  get regExpMap() {
    return {
      start: {
        full: this.startRegex,
        partial: this.startRegex,
      },
      end: {
        full: this.endRegex,
        partial: this.endRegex,
      },
    }
  }
}
