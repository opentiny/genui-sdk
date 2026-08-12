/**
 * Angular 代码生成器测试
 *
 * 运行：npx tsx src/code-generator/__tests__/generate.spec.ts
 */
import { generateCode } from '../generators/tinyng-generator';
import type { CardSchema } from '@opentiny/genui-sdk-core';

const demo = 
{
  "componentName": "Page",
  "state": {
    "srcData": {
      "data": [
        {
          "id": "001",
          "name": "张三",
          "department": "技术部",
          "position": "前端工程师",
          "email": "zhangsan@example.com",
          "hireDate": "2022-03-15"
        },
        {
          "id": "002",
          "name": "李四",
          "department": "市场部",
          "position": "市场经理",
          "email": "lisi@example.com",
          "hireDate": "2021-07-22"
        },
        {
          "id": "003",
          "name": "王五",
          "department": "人事部",
          "position": "HR专员",
          "email": "wangwu@example.com",
          "hireDate": "2023-01-10"
        },
        {
          "id": "004",
          "name": "赵六",
          "department": "财务部",
          "position": "会计",
          "email": "zhaoliu@example.com",
          "hireDate": "2020-11-05"
        },
        {
          "id": "005",
          "name": "钱七",
          "department": "技术部",
          "position": "后端工程师",
          "email": "qianqi@example.com",
          "hireDate": "2022-09-30"
        }
      ],
      "state": {}
    },
    "displayedData": [],
    "columns": [
      {
        "field": "id",
        "title": "员工ID"
      },
      {
        "field": "name",
        "title": "姓名"
      },
      {
        "field": "department",
        "title": "部门"
      },
      {
        "field": "position",
        "title": "职位"
      },
      {
        "field": "email",
        "title": "邮箱"
      },
      {
        "field": "hireDate",
        "title": "入职日期"
      }
    ]
  },
  "methods": {},
  "children": [
    {
      "componentName": "TiCard",
      "children": [
        {
          "componentName": "h3",
          "props": {
            "style": "font-size: 18px; font-weight: bold; margin-bottom: 16px;"
          },
          "children": "员工信息表"
        },
        {
          "componentName": "TiTable",
          "props": {
            "srcData": {
              "type": "JSExpression",
              "value": "this.state.srcData"
            },
            "displayedData": {
              "type": "JSExpression",
              "model": true,
              "value": "this.state.displayedData"
            },
            "columns": {
              "type": "JSExpression",
              "value": "this.state.columns"
            },
            "border": true,
            "stripe": true
          },
          "children": [
            {
              "componentName": "table",
              "children": [
                {
                  "componentName": "thead",
                  "children": [
                    {
                      "componentName": "tr",
                      "children": [
                        {
                          "componentName": "th",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "column.title"
                                }
                              }
                            }
                          ],
                          "loop": {
                            "type": "JSExpression",
                            "value": "this.state.columns"
                          },
                          "loopArgs": ["column"]
                        }
                      ]
                    }
                  ]
                },
                {
                  "componentName": "tbody",
                  "children": [
                    {
                      "componentName": "tr",
                      "loop": {
                        "type": "JSExpression",
                        "value": "this.state.displayedData"
                      },
                      "loopArgs": ["row"],
                      "children": [
                        {
                          "componentName": "td",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "row.id"
                                }
                              }
                            }
                          ]
                        },
                        {
                          "componentName": "td",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "row.name"
                                }
                              }
                            }
                          ]
                        },
                        {
                          "componentName": "td",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "row.department"
                                }
                              }
                            }
                          ]
                        },
                        {
                          "componentName": "td",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "row.position"
                                }
                              }
                            }
                          ]
                        },
                        {
                          "componentName": "td",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "row.email"
                                }
                              }
                            }
                          ]
                        },
                        {
                          "componentName": "td",
                          "children": [
                            {
                              "componentName": "Text",
                              "props": {
                                "text": {
                                  "type": "JSExpression",
                                  "value": "row.hireDate"
                                }
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
} as CardSchema;

// === 测试 ===

async function run() {
  const cases = [
    { name: 'FormComponents', schema: demo },
  ];

  console.log('='.repeat(60));
  console.log('  Angular Code Generator Test');
  console.log('='.repeat(60));

  for (const { name, schema } of cases) {
    const result = await generateCode({ pageInfo: { schema, name }, formatWithPrettier: true });
    console.log(`\n${'-'.repeat(60)}`);
    console.log(`[${name}]  ${result.panelName}  (errors: ${result.errors.length})`);
    console.log('-'.repeat(60));
    console.log(result.panelValue);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('schemas generated successfully.');
  console.log('='.repeat(60));
}

run().catch((e) => { console.error(e); process.exit(1); });
