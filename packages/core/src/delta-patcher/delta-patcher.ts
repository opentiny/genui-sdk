import type { Delta } from 'jsondiffpatch';
import * as jsonDiffPatch from 'jsondiffpatch';
import { flatten } from 'flat';
import { get } from 'radash';
import { jsonSelectorMatcher } from '../delta-json-path-selector/json-selector-matcher';
// import DiffMatchPatch from 'diff-match-patch';

type ISchema = any;

export type FlattenKeysType = string[];
export interface IPatchOptions {
  requiredCompleteFieldSelectors?: string[];
}

export class DeltaPatcher {
  protected diffPatcher: jsonDiffPatch.DiffPatcher;
  protected options: IPatchOptions;
  constructor(options: IPatchOptions = {}) {
    this.diffPatcher = jsonDiffPatch.create({
      objectHash: function (obj: { fileName?: string; id?: string }, index) {
        return obj.fileName || obj.id || `$$index:${index}`;
      },
      arrays: {
        detectMove: true,
        includeValueOnMove: false,
      },
      // textDiff: {
      //     diffMatchPatch: DiffMatchPatch,
      //     minLength: 60
      // },
      propertyFilter: function (name) {
        return name.slice(0, 1) !== '$';
      },
      cloneDiffValues: false,
    });
    this.options = options;
  }

  protected isNeedCompleteKeys(schema: ISchema, compareKey: string | null, getShortestKey = false) {
    if (!compareKey || !this.options.requiredCompleteFieldSelectors) {
      return getShortestKey ? { isMatch: false, matchPath: '' } : false;
    }

    const actualKey = compareKey;
    if (!getShortestKey) {
      return this.options.requiredCompleteFieldSelectors.some(
        (key) => jsonSelectorMatcher(schema, key, actualKey).isMatch,
      );
    }

    const result = this.options.requiredCompleteFieldSelectors
      .map((key) => jsonSelectorMatcher(schema, key, actualKey))
      .filter((item) => item.isMatch)
      .sort((a, b) => b.matchPath.length - a.matchPath.length)
      .pop();
    return result || { isMatch: false, matchPath: '' };
  }

  // 过滤掉_t的key
  protected filterDiffFlatten(delta: Delta) {
    const flattenObj = flatten(delta || {}) as Record<string, any>;
    const filterObj = {} as Record<string, any>;
    Object.keys(flattenObj).forEach((key: string) => {
      if (this.getActualKey(key, delta)) {
        filterObj[key] = flattenObj[key];
      }
    });
    return filterObj;
  }

  protected getActualMatchPath(key: string, matchPath: string, deltaIndex: number) {
    const keys = key.split('.');
    const matchKeys = matchPath.split('.');
    let index = 0;
    let matchIndex = 0;
    for (const key of keys) {
      if (matchIndex >= matchKeys.length) {
        break;
      }
      if (key === matchKeys[matchIndex] && index !== deltaIndex) {
        matchIndex++;
      }
      index++;
    }
    return keys.slice(0, index).join('.');
  }

  protected getAccurateDelta(schema: ISchema, delta: Delta, flattenKeys: FlattenKeysType) { // TODO: too complex, need to simplify
    const lastKey = flattenKeys[flattenKeys.length - 1];
    const { index: deltaIndex, actualKey } = this.getActualKeyAndIndex(lastKey, delta);
    const { isMatch, matchPath } = this.isNeedCompleteKeys(schema, actualKey, true) as {
      isMatch: boolean;
      matchPath: string;
    };

    if (isMatch) {
      const cloneDelta = structuredClone(delta);
      const deltaPath = this.getActualMatchPath(lastKey, matchPath, deltaIndex ?? -1);
      const { parent, selfKey } = deltaPath.match(/((?<parent>.*)\.)?(?<selfKey>.*?)$/)?.groups || {};

      const target = get(cloneDelta, parent || '') as any;
      if (target) {
        const deltaPathLength = deltaPath.split('.').length;
        if (deltaIndex !== null && deltaIndex <= deltaPathLength) {
          if (deltaIndex === deltaPathLength) {
            this.removeSingleChildParent(cloneDelta, deltaPath.split('.'), true);
          } else if (deltaIndex < deltaPathLength - 1) {
            if (Array.isArray(target)) {
              target.splice(Number(selfKey), 1);
            } else {
              delete target[selfKey];
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[DeltaPatcher]: Impossible branch(for debugging): delta path: ', deltaPath, 'operatorIndex: ', deltaIndex, 'matchPath: ', matchPath, '.  Please check the schema and delta.');
            }
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[DeltaPatcher]: The existing object does not satisfy the rule, here only remove the additional part: delta path: ', deltaPath, 'operatorIndex: ', deltaIndex, 'matchPath: ', matchPath, '.');
          }
          this.removeSingleChildParent(cloneDelta, deltaPath.split('.'), true);
        }
      }
      return Object.keys(cloneDelta || {}).length > 0 ? cloneDelta : null;
    }
    return delta;
  }

  protected removeSingleChildParent(delta: Delta, paths: string[], isRoot = false) {
    const [key, ...rest] = paths;

    if (!delta) {
      return;
    }

    const child = (delta as any)[key] as Delta;
    if (child) {
      if (rest.length === 0) {
        delete (delta as any)[key];
      } else {
        this.removeSingleChildParent(child, rest);
        const isChildArray = (child as unknown as jsonDiffPatch.ArrayDelta)['_t'] === 'a';
        const objKeys = Object.keys(child);
        if (isChildArray) {
          if (objKeys.length === 1) {
            delete (delta as any)[key];
          }
        } else {
          if (objKeys.length === 0) {
            delete (delta as any)[key];
          }
        }
      }
    }
    return delta;
  }

  protected getActualKey(key: string, diff: Delta) {
    const { actualKey } = this.getActualKeyAndIndex(key, diff);
    return actualKey;
  }

  protected getActualKeyAndIndex(key: string, diff: Delta) {
    // 过滤Delta的标记格式
    const keys = key.split('.');
    const result: string[] = [];
    let current: any = diff;
    let index = 0;
    for (const key of keys) {
      const isArray = Array.isArray(current);
      if (current['_t'] === 'a' && Number.isNaN(Number(key))) {
        return { actualKey: null, index: null };
      }
      if (current['_t'] !== 'a' && isArray && Number.isInteger(Number(key))) {
        const actualKey = [...result, ...keys.slice(index + 1)].join('.');
        return { actualKey, index };
      }
      result.push(key);
      if (isArray) {
        current = current[Number(key)];
      } else {
        current = current[key as keyof typeof current];
      }
      index++;
    }
    return { actualKey: result.join('.'), index };
  }

  protected isDeleteKey(key: string | null, delta: Delta) {
    if (!key) {
      return false;
    }
    const target = get(delta, key);
    return Array.isArray(target) && target.length === 3;
  }

  protected getPatchDelta(schema: ISchema, delta: Delta) {

    const flattenKeys = Object.keys(this.filterDiffFlatten(delta));
    if (delta && !flattenKeys.length) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DeltaPatcher]: unexpected root level changes, delta: ', JSON.stringify(delta));
      }
      return delta;
    }
    const lastKey = flattenKeys[flattenKeys.length - 1];

    const actualKey = this.getActualKey(lastKey, delta);

    if (this.isDeleteKey(actualKey, delta)) {
      return delta;
    }

    if (!this.isNeedCompleteKeys(schema, actualKey)) {
      return delta;
    }

    if (flattenKeys.length === 1) {
      return null;
    }

    return this.getAccurateDelta(schema, delta, flattenKeys);
  }

  public patchWithDelta(oldValue: Object, newValue: Object, isCompleted: boolean) {
    if (!newValue) {
      return oldValue;
    }
    const diff = this.diffPatcher.diff(oldValue, newValue);
    if (!diff) {
      return oldValue;
    }

    if (isCompleted) {
      return this.diffPatcher.patch(oldValue, diff);
    }

    const delta = this.getPatchDelta(newValue, diff);
    if (!delta) {
      return oldValue;
    }
    return this.diffPatcher.patch(oldValue, delta);
  }
}
