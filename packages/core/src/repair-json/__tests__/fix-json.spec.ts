import { fixJson } from 'ai/src/util/fix-json';
import { describe, expect, it } from 'vitest';
import { jsonrepair } from 'jsonrepair';

describe('fixJson测试案例', () => {
  describe('完整 JSON 透传', () => {
    it('原样返回已闭合的对象、数组', () => {
      expect(fixJson('{}')).toBe('{}');
      expect(fixJson('[]')).toBe('[]');
      expect(fixJson('{"a":1,"b":[2,true,null]}')).toBe('{"a":1,"b":[2,true,null]}');
    });
  });

  describe('截断结构自动闭合', () => {
    it('补全未闭合的对象与数组', () => {
      expect(fixJson('{')).toBe('{}');
      expect(fixJson('[')).toBe('[]');
      expect(fixJson('{"a":1')).toBe('{"a":1}');
      expect(fixJson('[1,2')).toBe('[1,2]');
    });

    it('补全嵌套截断', () => {
      expect(fixJson('{"items":[{"id":1')).toBe('{"items":[{"id":1}]}');
      expect(fixJson('{"a":{"b":[1')).toBe('{"a":{"b":[1]}}');
    });

    it('在逗号后截断时闭合容器', () => {
      expect(fixJson('{"a":1,')).toBe('{"a":1}');
      expect(fixJson('[1,2,')).toBe('[1,2]');
    });
  });

  describe('未闭合的属性名', () => {
    it('上一属性已完整，下一个 key 写到一半', () => {
      expect(fixJson('{"componentNa')).toBe('{}');
      expect(fixJson('{"componentName')).toBe('{}');
      expect(fixJson('{"componentName": "div", "children": [{ "componentName": "TinyButton", "prop  }')).toBe(
        '{"componentName": "div", "children": [{ "componentName": "TinyButton"}]}',
      );
    });

    it('key 引号已闭合但尚未写出冒号', () => {
      expect(fixJson('{"componentName"')).toBe('{}');
    });

    it('上一属性已完整，下一个 key 仅写出起始引号', () => {
      expect(fixJson('{"componentName":"div","')).toBe('{"componentName":"div"}');
    });
  });

  describe('未闭合属性值', () => {
    it('字符串写到一半', () => {
      expect(fixJson('{"msg":"hello')).toBe('{"msg":"hello"}');
    });

    it('含中文等 Unicode 的字符串', () => {
      expect(fixJson('{"label":"中文')).toBe('{"label":"中文"}');
    });

    it('数字值写到一半', () => {
        expect(fixJson('{"num":12')).toBe('{"num":12}');
        expect(fixJson('{"num":3.')).toBe('{"num":3}');
        expect(fixJson('{"num":3.14')).toBe('{"num":3.14}');
      });

    it('布尔值写到一半', () => {
      expect(fixJson('{"bool":tr')).toBe('{"bool":true}');
      expect(fixJson('{"bool":fal')).toBe('{"bool":false}');
    });

    it('null 值写到一半', () => {
      expect(fixJson('{"null":nu')).toBe('{"null":null}');
    });
  });

  describe('其他边界条件', () => {
    it('空字符串', () => {
      expect(fixJson('')).toBe('');
    });

    it('无效的JSON', () => {
      expect(fixJson('###')).toBe('');
    });
  });

  /** 非「未闭合」类问题，留作后续 fixJson 增强 */
  describe.todo('后续改进 fixJson 后启用', () => {
    it.skip('补充缺失的属性名引号', () => {
        expect(fixJson('{"componentName": "Page", "methods": { handleSubmit: { "type": "JSFunction", "value": "function() { console.log(\\\"handleSubmit\\\") }"}}, "children": [{ "componentName": "TinyButton"')).toBe(
            '{"componentName": "Page", "methods": { "handleSubmit": { "type": "JSFunction", "value": "function() { console.log(\\\"handleSubmit\\\") }"}}, "children": [{ "componentName": "TinyButton"}]}',
          );
    });

  });
});

describe('fixJson和jsonrepair的修复差异', () => {
  it('未闭合的属性名修复差异', () => {
    expect(fixJson('{"componentNa')).toBe('{}');
    expect(fixJson('{"componentName')).toBe('{}');
    expect(jsonrepair('{"componentNa')).toBe('{"componentNa":null}');
    expect(jsonrepair('{"componentName')).toBe('{"componentName":null}');
  });

  it('完整但却少括号的JSON修复差异', () => {
    expect(fixJson('{ “parent”: { "child" : { "value1": 1, "arrValue": [1,2,3  }}')).toBe('{ “parent”: { "child" : { "value1": 1, "arrValue": [1,2,3  }}]}}');
    expect(jsonrepair('{ “parent”: { "child" : { "value1": 1, "arrValue": [1,2,3  }}')).toBe('{ "parent": { "child" : { "value1": 1, "arrValue": [1,2,3]  }}}');
  });

  it('属性名缺少引号', () => {
    // 后续属性被丢失
    expect(fixJson('{ "value1": { a: {} }, "value2": 2 }')).toBe('{ "value1": { a: {} }');
    expect(jsonrepair('{ "value1": { a: {} }, "value2": 2 }')).toBe('{ "value1": { "a": {} }, "value2": 2 }');
  })

  it('未闭合的值中带有左括号', () => {
    expect(fixJson('{ "value": "function {')).toBe('{ "value": "function {"}');
    expect(() => jsonrepair('{ "value": "function {')).toThrow(
      'Unexpected character "{" at position 21',
    );
  });

});
