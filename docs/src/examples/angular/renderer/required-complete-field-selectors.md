# Renderer 组件 - 缓冲字段

请参考 [配置缓冲字段](../../renderer/required-complete-field-selectors)

## 自定义配置

### 参考案例

<demo vue="../../../../demos/angular/renderer/required-complete-field-selectors.vue"  :vueFiles="['../../../../demos/angular/renderer/required-complete-field-selectors.ts']"/>

### 效果说明

配置`requiredCompleteFieldSelectors`前， Text组件文字会根据大模型已输出等内容同步输出， 配置后，会等整个文本输出完成后输出，但是不影响div内部的文本