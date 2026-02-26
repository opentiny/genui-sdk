import { SchemaJsonPattern } from "./schema-json-pattern";

export class PatternExtractor {
  protected streamCache: string = '';
  protected state: 'handling' | 'normal' = 'normal';
  protected onNormalWrite: (value: string) => void;
  protected onHandledWrite: (value: string) => void;
  protected keepFlag: false | 'handling' | 'normal' = false;
  protected regExpMap: Record<'start' | 'end', Record<'full' | 'partial', RegExp>>;

  constructor(config: {
    onNormalWrite: (value: string) => void;
    onHandledWrite: (value: string) => void;
    keepFlag?: false | 'handling' | 'normal';
    regExpMap?: Record<string, Record<'full' | 'partial', RegExp>>;
  }) {
    this.onNormalWrite = config.onNormalWrite;
    this.onHandledWrite = config.onHandledWrite;
    this.keepFlag = config.keepFlag ?? this.keepFlag;
    this.regExpMap = config.regExpMap ?? new SchemaJsonPattern().regExpMap;
  }

  public reset() {
    this.streamCache = '';
    this.state = 'normal';
  }

  protected updateNormalStream(value: string) {
    if (value.length > 0) {
      this.onNormalWrite?.(value);
    }
  }
  protected updateHandledStream(value: string) {
    if (value.length > 0) {
      this.onHandledWrite?.(value);
    }
  }

  protected containsFlag(str: string, flag: RegExp, offset: number = 0): { result: boolean, index: number, length: number } {
    const match = str.substring(offset).match(flag);
    if (match && match.index !== undefined) return { result: true, index: offset + match.index, length: match[0].length };
    return { result: false, index: -1, length: 0 };
  }

  protected getNextState() {
    return this.state === 'normal' ? 'handling' : 'normal';
  }
  protected getLookingState() {
    return this.state === 'normal' ? 'start' : 'end';
  }

  protected updateStream(value: string) {
    if (this.state === 'normal') {
      this.updateNormalStream(value);
    } else {
      this.updateHandledStream(value);
    }
  }

  protected updateStreamWithFlag(value: string) {
    if (this.keepFlag === this.state) {
      this.updateStream(value);
    }
  }

  public handleContent(content: string) {
    let offset = 0;
    const value = this.streamCache + content;
    while (offset < value.length) {
      offset = this.handleValue(value, offset);
    }
    return this.streamCache;
  }

  protected handleValue(value: string, prevOffset: number = 0) {
    let offset = prevOffset;
    const lookingState = this.getLookingState();
    const { result, index, length } = this.containsFlag(value, this.regExpMap[lookingState].full, offset);
    if (result) {
      this.updateStream(value.substring(offset, index));
      const flagString = value.substring(index, index + length);
      this.updateStreamWithFlag(flagString);
      this.state = this.getNextState();
      this.updateStreamWithFlag(flagString);
      offset = index + length;
      this.streamCache = '';
    } else {
      const { result, index, length } = this.containsFlag(value, this.regExpMap[lookingState].partial, offset);
      if (result) {
        this.updateStream(value.substring(offset, index));
        offset = index + length; // must be equals to value.length,
        this.streamCache = value.substring(index, value.length);
      } else {
        this.updateStream(value.substring(offset, value.length));   
        offset = value.length;
        this.streamCache = '';
      }
    }
    return offset;
  }
}