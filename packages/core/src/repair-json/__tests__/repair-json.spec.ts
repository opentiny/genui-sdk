import { describe, expect, it } from 'vitest';
import { RepairJsonState, repairJson, safeJsonParse } from '../repair-json';

describe('safeJsonParse', () => {
  it('解析合法 JSON 并返回值', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('[1,2]')).toEqual([1, 2]);
    expect(safeJsonParse('null')).toBeNull();
    expect(safeJsonParse('true')).toBe(true);
    expect(safeJsonParse('"x"')).toBe('x');
  });

  it('非法 JSON 返回 undefined', () => {
    expect(safeJsonParse('')).toBeUndefined();
    expect(safeJsonParse('{')).toBeUndefined();
    expect(safeJsonParse('not json')).toBeUndefined();
  });
});

describe('repairJson', () => {
  describe('非法输入', () => {
    it('非法输入返回INVALID_INPUT', () => {
      expect(repairJson(undefined)).toEqual({
        state: RepairJsonState.INVALID_INPUT,
        value: undefined,
      });
      expect(repairJson(null as unknown as string)).toEqual({
        state: RepairJsonState.INVALID_INPUT,
        value: undefined,
      });
      expect(repairJson(42 as unknown as string)).toEqual({
        state: RepairJsonState.INVALID_INPUT,
        value: undefined,
      });

      expect(repairJson({} as unknown as string)).toEqual({
        state: RepairJsonState.INVALID_INPUT,
        value: undefined,
      });

    });
  });

  describe('合法输入,无需修复', () => {
    it('合法输入返回SUCCESS', () => {
      expect(repairJson('{}')).toEqual({
        state: RepairJsonState.SUCCESS,
        value: {},
      });
      expect(repairJson('{"k":"v"}')).toEqual({
        state: RepairJsonState.SUCCESS,
        value: { k: 'v' },
      });
      expect(repairJson('[1,2,3]')).toEqual({
        state: RepairJsonState.SUCCESS,
        value: [1, 2, 3],
      });
    });

    it('接受含无关空白符的 JSON', () => {
      expect(repairJson(`{
        "a": 1
      }`)).toEqual({
        state: RepairJsonState.SUCCESS,
        value: { a: 1 },
      });
    });
  });

  describe('需修复', () => {
    it('修复对象和数组中的尾随逗号', () => {
      expect(repairJson('{"a":1,}')).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { a: 1 },
      });
      expect(repairJson('[1,2,]')).toEqual({
        state: RepairJsonState.REPAIRED,
        value: [1, 2],
      });
    });

    it('修复单引号包裹的键和字符串', () => {
      expect(repairJson("{'a':'b'}")).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { a: 'b' },
      });
    });

    it('修复未加引号的键', () => {
      expect(repairJson('{a:1}')).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { a: 1 },
      });
    });

    it('通过 fixJson 补全截断的流式 JSON 后解析', () => {
      expect(repairJson('{"items":[{"id":1')).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { items: [{ id: 1 }] },
      });
    });

    it('修复拼接 JSON，取第一个值', () => {
      expect(repairJson('{"a":1}{"b":2}')).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { a: 1 },
      });
    });

    it('去除 JavaScript 风格注释', () => {
      expect(repairJson(`{"a": 1, /* c */ "b": 2 }`)).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { a: 1, b: 2 },
      });
    });

    it('修复完整JSON中缺少的闭合括号', () => {
      expect(repairJson('{ “parent”: { "child" : { "value1": 1, "arrValue": [1,2,3  }}')).toEqual({
        state: RepairJsonState.REPAIRED,
        value: { parent: {
          child: {
            value1: 1,
            arrValue: [1,2,3],
          },
        } },
      });
    });
  });
});
