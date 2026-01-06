export const aboutThis = `
## this上下文声明
### this可访问范围：

this在表达式JSExpression中可以访问，但不能在表达式内的行内函数访问；this也可以在JSFunction中访问。

### this默认有以下几个属性：

- this.state：当前组件所有在state声明的变量;
- 在methods里声明的方法可以直接用this属性访问，比如声明 hello方法，则通过this.hello()访问。


### this使用方法：

让函数访问到当前执行的上下文范围可以有以下几种方式：

1.JSFunction模式

如果正在使用JSFunction 比如 
\`\`\`
{
    "type": "JSFunction",
    "value": "(event) => this.hello(event, name)"
}
\`\`\`

2.JSExpression扩展参数模式

如果正在使用JSExpression，通过添加params参数，可以扩展参数，比如
\`\`\`
{
    "type": "JSExpression",
    "value": "this.hello",
    "params": ["name"]
}
\`\`\`
注意：示例中，启用params的话，函数第一个参数是event 第二个参数才是name
params参数必须是一个数组，数组中的每个元素都是字符串，每个字符串代表了当前的上下文scope变量名，不要传入'row.name'等表达式。
JSExpression指向的函数第一个参数是event 第二个参数才是用户制定的params

这两种方式都相当于执行了 this.hello(event, name)

### this不存在的属性

特别注意：this上下文并不存在this.setState方法，任何时候都不要使用， 直接给this.state赋值即可。
重复三次：不存在this.setState方法，不存在this.setState方法，不存在this.setState方法。
`;

