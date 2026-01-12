# 附录：基于Json Diff Delta的属性完整性缓冲延迟更新策略与算法

## 路径匹配算法

受到css选择器的启发，参考下新创了一套类似的选择器语法，支持复杂的嵌套路径匹配：

- `componentName`：直接匹配字段名
- `[componentName=Img] > src`：匹配组件名为 Img 的元素的 src 属性
- `[type=JSFunction] > value`：匹配 type 为 JSFunction 的元素的 value 属性
- `[componentName^=TinyChart] > props > *`: 匹配组件名医TinyChart开头的元素的props属性的所有子属性
- 支持 `>` 子选择器、`[attr=value]` 属性选择器等语法

## 延迟更新策略

1. 计算新旧 schema 的差异（diff）

```ts
// 所有代码均为伪装代码（下同）
const delta = jsonDiffPatchInstance.diff(oldValue, newValue);
```

2. 检查差异中是否包含关键字段

```ts
const lastDeltaPath = Object.keys(flaten(Delta))
  .filter((deltaPath) => isValidateSchemaPath(deltaPath2schemaPath(deltaPath, delta), delta))
  .pop();
const lastSchemaPath = deltaPath2schemaPath(lastDeltaPath, delta);
const needComplete = requiredCompleteFieldSelectors.some(
  (selector) => jsonSelectorMatcher(schema, selector, lastSchemaPath).isMatch,
);
```

2.1 如果不含有关键关键字段则把delta应用到更新上

```ts
if (!needComplete) {
  oldValue = jsonDiffPatchInstance.patch(oldValue, delta);
}
```

2.2 如果包含关键字段未完整（正在写入），则丢弃此次更新中关于本字段的更新，其余字段应用更新，如果没有其余字段就不更新

```ts
// 找到最祖先的关键字段schema路径
const shortestSchemaPath = requiredCompleteFieldSelectors
  .map((selector) => jsonSelectorMatcher(schema, selector, lastSchemaPath)) // 匹配所有规则以找到要丢弃的更新的最前面的节点
  .filter((matchResult) => matchResult.isMatch) // 过滤掉没匹配上的规则
  .sort((a, b) => a.matchPatch.length - b.matchPath.length) // 从长到短排序
  .pop().matchPath; //弹出最短的访问路径

// 换算为Delta路径
const shortestDeltaPath = schemaPath2DeltaPath(shortestSchemaPath, lastDeltaPath);
// 抹掉当前关键字段的delta
const newDelta = removeDeltaPathValue(delta, shortestDeltaPath);

if (newDelta) {
  oldValue = jsonDiffPatchInstance.patch(oldValue, newDelta);
}
```

2.3 如果关键字段已完整（已经写入下一个字段），则由下一个字段是否是关键字段来选择2.1或者2.2应用更新，吧前面已经完成的字段刷新
注意：情况总会落到2.1或者2.2， 除了最后一个字段它不存在下一个字段，此时需要3

3. 生成结束时，强制全量更新确保最终一致性， 防止最后一个字段是关键字段时候无法应用更新

```ts
const latestDelta = jsonDiffPatchInstance.diff(oldValue, newValue);
oldValue = jsonDiffPatchInstance.patch(oldValue, latestDelta);
```
