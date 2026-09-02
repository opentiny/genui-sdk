## 卡片示例

### 双向绑定的表单

```json
{"state":{"formData":{"name":"张三","sex":"男","depart":"HR","protocolStart":"2023-01-01"}},"refs":{"formRef":null},"methods":{"departChange":{"type":"JSFunction","value":"function departChange(value) { console.log(value) }"}},"componentName":"Page","children":[{"componentName":"TinyCard","children":[{"componentName":"h3","children":"更新员工信息"},{"componentName":"TinyForm","props":{"model":{"type":"JSExpression","value":"this.state.formData"},"ref":{"type":"JSExpression","value":"this.refs.formRef"},"labelPosition":"top"},"children":[{"componentName":"TinyFormItem","props":{"label":"姓名","prop":"name","required":true},"children":[{"componentName":"TinyInput","props":{"placeholder":"请输入","modelValue":{"type":"JSExpression","model":true,"value":"this.state.formData.name"}}}]},{"componentName":"TinyFormItem","props":{"label":"性别","prop":"sex"},"children":[{"componentName":"TinyRadioGroup","props":{"options":[{"text":"男","label":"男"},{"text":"女","label":"女"}],"modelValue":{"type":"JSExpression","model":true,"value":"this.state.formData.sex"}}}]},{"componentName":"TinyFormItem","props":{"label":"部门","prop":"depart","required":true},"children":[{"componentName":"TinySelect","props":{"placeholder":"请选择","modelValue":{"type":"JSExpression","model":true,"value":"this.state.formData.depart"},"options":[{"value":"HR","label":"人事部"},{"value":"other","label":"其他部门"}],"onChange":{"type":"JSExpression","value":"this.departChange"}}}]},{"componentName":"TinyFormItem","props":{"label":"入职日期","prop":"protocolStart"},"children":[{"componentName":"TinyDatePicker","props":{"placeholder":"请输入","disabled":true,"modelValue":{"type":"JSExpression","model":true,"value":"this.state.formData.protocolStart"}}}]},{"componentName":"TinyFormItem","props":{"label":""},"children":[{"componentName":"TinyButton","props":{"text":"确认","onClick":{"type":"JSFunction","value":"function() { this.refs.formRef.validate().then(res => { console.log(\"校验通过\", res) }).catch((err) => { console.log(\"校验失败, 失败只做提示，不继续会话\", err) }) }"}}}]}]}]}]}
```

### 信息展示卡片

```json
{"componentName":"Page","children":[{"componentName":"TinyCard","children":[{"componentName":"Text","props":{"style":"font-size: 14px;font-weight: bold;line-height:2;margin-bottom:20px;display:block;","text":"员工信息详情"}},{"componentName":"div","props":{"className":"component-base-style","style":"width: 374px; background: #f5f5f5;border-radius: 12px;line-height:2;font-size:14px;padding: 20px 0;"},"children":[{"componentName":"TinyLayout","props":{"className":"component-base-style"},"children":[{"componentName":"TinyRow","children":[{"componentName":"TinyCol","props":{"span":3},"children":[{"componentName":"Text","props":{"text":"姓名"}}]},{"componentName":"TinyCol","props":{"span":9},"children":[{"componentName":"Text","props":{"text":"张三"}}]}]},{"componentName":"TinyRow","children":[{"componentName":"TinyCol","props":{"span":3},"children":[{"componentName":"Text","props":{"text":"电话"}}]},{"componentName":"TinyCol","props":{"span":9},"children":[{"componentName":"Text","props":{"text":"18856254558"}}]}]}]}]}]}],"id":"body"}
```

### 表格卡片

```json
{"componentName":"Page","css":".page-base-style {padding: 24px;background: #FFFFFF;}.block-base-style {margin: 16px;}.component-base-style {margin: 8px;}","props":{"className":"page-base-style"},"lifeCycles":{},"children":[{"componentName":"TinyCard","children":[{"componentName":"TinyGrid","props":{"columns":[{"type":"index","width":60},{"field":"name","title":"姓名"},{"field":"id","title":"工号"},{"field":"sex","title":"性别"},{"field":"department","title":"部门"},{"field":"protocolStart","title":"入职日期"},{"field":"email","title":"邮箱"},{"title":"操作","slots":{"default":{"type":"JSSlot","value":[{"componentName":"div","id":"23324161","children":[{"componentName":"TinyButton","props":{"className":"component-base-style","text":{"type":"JSExpression","value":"`编辑${row.name}`"}},"children":[],"id":"24392624"}]}],"params":["row"]}}}],"data":[{"name":"李四","id":"2","sex":"女","department":"技术部","protocolStart":"2019-05-15","email":"lisi@test.com"}],"className":"component-base-style"}}]}],"dataSource":{"list":[]},"id":"body"}
```

### Tabs卡片

```json
{"state":{"activeTab":"basic"},"methods":{},"componentName":"Page","children":[{"componentName":"TinyCard","children":[{"componentName":"h3","props":{},"children":"订单详情"},{"componentName":"TinyTabs","props":{"modelValue":{"type":"JSExpression","model":true,"value":"this.state.activeTab"}},"children":[{"componentName":"TinyTabItem","props":{"title":"基本信息","name":"basic"},"children":[{"componentName":"Text","props":{"text":"订单号：ORD-20240301"}},{"componentName":"Text","props":{"text":"下单时间：2024-03-01 10:30"}}]},{"componentName":"TinyTabItem","props":{"title":"物流信息","name":"logistics"},"children":[{"componentName":"Text","props":{"text":"承运商：顺丰速运"}},{"componentName":"Text","props":{"text":"运单号：SF1234567890"}}]},{"componentName":"TinyTabItem","props":{"title":"售后","name":"service"},"children":[{"componentName":"Text","props":{"text":"暂无售后记录"}}]}]}]}]}
```


