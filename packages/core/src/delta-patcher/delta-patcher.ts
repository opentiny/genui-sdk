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

  protected getActualMatchPath(key: string, matchPath: string) {
    const keys = key.split('.');
    const matchKeys = matchPath.split('.');
    let index = 0;
    let matchIndex = 0;
    for (const key of keys) {
      if (matchIndex >= matchKeys.length) {
        break;
      }
      if (key === matchKeys[matchIndex]) {
        matchIndex++;
      }
      index++;
    }
    return keys.slice(0, index).join('.');
  }

  protected getAccurateDelta(schema: ISchema, delta: Delta, flattenKeys: FlattenKeysType) {
    const lastKey = flattenKeys[flattenKeys.length - 1];
    const { index: deltaIndex, actualKey } = this.getActualKeyAndIndex(lastKey, delta);
    const { isMatch, matchPath } = this.isNeedCompleteKeys(schema, actualKey, true) as {
      isMatch: boolean;
      matchPath: string;
    };
    if (isMatch) {
      const deltaPath = this.getActualMatchPath(lastKey, matchPath);
      const { parent, selfKey } = deltaPath.match(/((?<parent>.*)\.)?(?<selfKey>.*?)$/)?.groups || {};
      const target = get(delta, parent || '') as any;

      if (target) {
        const deltaPathLength = deltaPath.split('.').length;
        if (deltaIndex !== null && deltaIndex <= deltaPathLength - 1) {
          if (deltaIndex === deltaPathLength - 1) {
            const { grandPranet, parentKey } = parent.match(/((?<grandPranet>.*)\.)?(?<parentKey>.*?)$/)?.groups || {};
            const removeAddTarget = get(delta, grandPranet || '') as any;
            if (Array.isArray(removeAddTarget)) {
              removeAddTarget.splice(Number(parentKey), 1);
            } else {
              delete removeAddTarget[parentKey];
            }
          } else if (deltaIndex < deltaPathLength - 1) {
            if (Array.isArray(target)) {
              target.splice(Number(selfKey), 1);
            } else {
              delete target[selfKey];
            }
          }
        } else {
          delete target[selfKey];
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

  protected isAddKey(key: string | null, delta: Delta) {
    if (!key) {
      return false;
    }
    const target = get(delta, key);
    return Array.isArray(target) && target.length === 1;
  }

  protected getPatchDelta(schema: ISchema, delta: Delta) {

    const flattenKeys = Object.keys(this.filterDiffFlatten(delta));
    const lastKey = flattenKeys[flattenKeys.length - 1];

    const actualKey = this.getActualKey(lastKey, delta);

    // 如果最后一个key是删除或者修改的内容，说明不在流式返回中。
    if (!this.isAddKey(actualKey, delta)) {
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
