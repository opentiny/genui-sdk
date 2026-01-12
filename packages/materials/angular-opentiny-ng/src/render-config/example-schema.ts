export const formSchema = {
  'state': {
    'formData': {
      'name': '张三',
      'sex': '男',
      'department': 'HR',
      'protocolStart': '2023-01-01',
      'email': '',
    },
  },
  'methods': {
    'departChange': {
      'type': 'JSFunction',
      'value': 'function departChange(value) { console.log(value) }',
    },
    'handleSubmit': {
      'type': 'JSFunction',
      'value': 'function handleSubmit() { console.log(this.state.formData) }',
    },
  },
  'componentName': 'Page',
  'props': {
    'style': 'width: 414px;',
  },
  'children': [
    {
      'componentName': 'h3',
      'props': {},
      'children': '更新员工信息',
    },
    {
      'componentName': 'div',
      'props': {
        'style': 'display: flex; flex-direction: column; gap: 16px;',
      },
      'children': [
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; flex-direction: column; gap: 8px;',
          },
          'children': [
            {
              'componentName': 'label',
              'props': {
                'style': 'font-weight: bold;',
              },
              'children': '姓名',
            },
            {
              'componentName': 'TiText',
              'props': {
                'placeholder': '请输入',
                'ngModel': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.name',
                },
              },
              'directives': [
                {
                  'directiveName': 'ngModel',
                },
                {
                  'directiveName': 'defaultValueAccessor',
                },
              ],
            },
          ],
        },
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; flex-direction: column; gap: 8px;',
          },
          'children': [
            {
              'componentName': 'label',
              'props': {
                'style': 'font-weight: bold;',
              },
              'children': '工号',
            },
            {
              'componentName': 'TiText',
              'props': {
                'disabled': true,
                'ngModel': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.id',
                },
              },
              'directives': [
                {
                  'directiveName': 'ngModel',
                },
                {
                  'directiveName': 'defaultValueAccessor',
                },
              ],
            },
          ],
        },
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; flex-direction: column; gap: 8px;',
          },
          'children': [
            {
              'componentName': 'label',
              'props': {
                'style': 'font-weight: bold;',
              },
              'children': '性别',
            },
            {
              'componentName': 'div',
              'props': {
                'style': 'display: flex; gap: 16px;',
              },
              'children': [
                {
                  'componentName': 'TiRadio',
                  'props': {
                    'value': '男',
                    'label': '男',
                  },
                },
                {
                  'componentName': 'TiRadio',
                  'props': {
                    'value': '女',
                    'label': '女',
                  },
                },
              ],
            },
          ],
        },
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; flex-direction: column; gap: 8px;',
          },
          'children': [
            {
              'componentName': 'label',
              'props': {
                'style': 'font-weight: bold;',
              },
              'children': '部门',
            },
            {
              'componentName': 'TiSelect',
              'props': {
                'placeholder': '请选择',
                'ngModel': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.department',
                },
                'options': [
                  {
                    'value': 'HR',
                    'label': '人事部',
                  },
                  {
                    'value': 'other',
                    'label': '其他部门',
                  },
                ],
                'ngModelChange': {
                  'type': 'JSExpression',
                  'value': 'this.departChange',
                },
              },
              'directives': [
                {
                  'directiveName': 'ngModel',
                },
              ],
            },
          ],
        },
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; flex-direction: column; gap: 8px;',
          },
          'children': [
            {
              'componentName': 'label',
              'props': {
                'style': 'font-weight: bold;',
              },
              'children': '入职日期',
            },
            {
              'componentName': 'TiDate',
              'props': {
                'placeholder': '请选择日期',
                'disabled': true,
                'ngModel': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.protocolStart',
                },
                'format': 'yyyy-MM-dd',
              },
              'directives': [
                {
                  'directiveName': 'ngModel',
                },
              ],
            },
          ],
        },
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; gap: 8px; margin-top: 16px;',
          },
          'children': [
            {
              'componentName': 'TiButton',
              'props': {
                'type': 'primary',
                'onClick': {
                  'type': 'JSExpression',
                  'value': 'this.handleSubmit',
                },
              },
              'children': '确认',
            },
            {
              'componentName': 'TiButton',
              'props': {
                'type': 'default',
              },
              'children': '取消',
            },
          ],
        },
      ],
    },
  ],
};

export const infoCardSchema = {
  'componentName': 'Page',
  'children': [
    {
      'componentName': 'h3',
      'props': {
        'style': 'font-size: 14px;font-weight: bold;line-height:2;margin-bottom:20px;display:block;',
      },
      'children': '员工信息详情',
    },
    {
      'componentName': 'TiCard',
      'props': {
        'header': '员工信息',
        'style': 'width: 374px;',
      },
      'children': [
        {
          'componentName': 'div',
          'props': {
            'style': 'display: flex; flex-direction: column; gap: 16px; padding: 20px;',
          },
          'children': [
            {
              'componentName': 'div',
              'props': {
                'style': 'display: flex;',
              },
              'children': [
                {
                  'componentName': 'span',
                  'props': {
                    'style': 'width: 80px; font-weight: bold;',
                  },
                  'children': '姓名',
                },
                {
                  'componentName': 'span',
                  'children': '张三',
                },
              ],
            },
            {
              'componentName': 'div',
              'props': {
                'style': 'display: flex;',
              },
              'children': [
                {
                  'componentName': 'span',
                  'props': {
                    'style': 'width: 80px; font-weight: bold;',
                  },
                  'children': '电话',
                },
                {
                  'componentName': 'span',
                  'children': '18856254558',
                },
              ],
            },
            {
              'componentName': 'div',
              'props': {
                'style': 'display: flex;',
              },
              'children': [
                {
                  'componentName': 'span',
                  'props': {
                    'style': 'width: 80px; font-weight: bold;',
                  },
                  'children': '部门',
                },
                {
                  'componentName': 'span',
                  'children': 'HR',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  'id': 'body',
};

export const gridSchema = {
  'componentName': 'Page',
  'css':
    '.page-base-style {padding: 24px;background: #FFFFFF;}.block-base-style {margin: 16px;}.component-base-style {margin: 8px;}',
  'props': { 'className': 'page-base-style' },
  'lifeCycles': {},
  'children': [
    {
      'componentName': 'TiTable',
      'props': {
        'srcData': {
          'type': 'JSExpression',
          'value': 'this.state.srcData',
        },
        'displayedData': {
          'type': 'JSExpression',
          'model': true,
          'value': 'this.state.displayedData',
        },
        'columns': {
          'type': 'JSExpression',
          'value': 'this.state.columns',
        },
        'className': 'component-base-style',
      },
      'children': [
        {
          'componentName': 'table',
          'children': [
            {
              'componentName': 'thead',
              'children': [
                {
                  'componentName': 'tr',
                  'children': [
                    {
                      'componentName': 'th',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'column.title',
                            },
                          },
                        },
                      ],
                      'loop': {
                        'type': 'JSExpression',
                        'value': 'this.state.columns',
                      },
                      'loopArgs': ['column'],
                    },
                  ],
                },
              ],
            },
            {
              'componentName': 'tbody',
              'children': [
                {
                  'componentName': 'tr',
                  'loop': {
                    'type': 'JSExpression',
                    'value': 'this.state.displayedData',
                  },
                  'loopArgs': ['row'],
                  'children': [
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.name',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.id',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.sex',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.department',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.protocolStart',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.email',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'TinyButton',
                          'props': {
                            'onClick': {
                              'type': 'JSFunction',
                              'value': 'function() { this.deleteRow(row) }',
                            },
                          },
                          'children': [
                            {
                              'componentName': 'Text',
                              'props': {
                                'text': {
                                  'type': 'JSExpression',
                                  'value': '`删除${row.name}`',
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  'state': {
    'columns': [
      { 'field': 'name', 'title': '姓名' },
      { 'field': 'id', 'title': '工号' },
      { 'field': 'sex', 'title': '性别' },
      { 'field': 'department', 'title': '部门' },
      { 'field': 'protocolStart', 'title': '入职日期' },
      { 'field': 'email', 'title': '邮箱' },
      { 'field': 'actions', 'title': '操作' },
    ],
    'srcData': [
      {
        'name': '李四',
        'id': '2',
        'sex': '女',
        'department': '技术部',
        'protocolStart': '2019-05-15',
        'email': 'lisi@test.com',
      },
      {
        'name': '王五',
        'id': '3',
        'sex': '男',
        'department': '市场部',
        'protocolStart': '2020-03-20',
        'email': 'wangwu@test.com',
      },
    ],
    'displayedData': [],
  },
  'methods': {
    'deleteRow': {
      'type': 'JSFunction',
      'value': 'function(row) { this.state.srcData = this.state.srcData.filter(item => item.id !== row.id) }',
    },
  },
  'dataSource': { 'list': [] },
  'id': 'body',
};

export const tabsSchema = {
  'componentName': 'Page',
  'fileName': 'Untitled',
  'css':
    '.page-base-style {\n  padding: 24px;background: #FFFFFF;\n}\n\n.block-base-style {\n  margin: 16px;\n}\n\n.component-base-style {\n  margin: 8px;\n}\n',
  'props': {
    'className': 'page-base-style',
  },
  'lifeCycles': {},
  'children': [
    {
      'componentName': 'div',
      'id': 'e9a7b6c5',
      'props': {
        'style': 'display: flex; flex-direction: column; align-items: center;',
      },
      'children': [
        {
          'componentName': 'h2',
          'id': 'f2g3h4i5',
          'props': {
            'style': 'font-size: 24px; font-weight: bold; margin-bottom: 20px;',
          },
          'children': '降本增效，加速企业数字化转型',
        },
        {
          'componentName': 'TiTabs',
          'id': 'j6k7l8m9',
          'props': {
            'className': 'component-base-style',
          },
          'children': [
            {
              'componentName': 'TiTab',
              'id': 'n0o1p2q3',
              'props': {
                'header': '精选推荐',
                'id': 'tab1',
                'active': true,
              },
              'children': [
                {
                  'componentName': 'div',
                  'id': 'r4s5t6u7',
                  'props': {
                    'style': 'display: flex; flex-wrap: wrap; justify-content: space-around; gap: 20px; padding: 20px;',
                  },
                  'children': [
                    {
                      'componentName': 'div',
                      'id': 'v8w9x0y1',
                      'props': {
                        'style':
                          'width: 25%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;',
                      },
                      'children': [
                        {
                          'componentName': 'img',
                          'id': 'z2a3b4c5',
                          'props': {
                            'src':
                              'https://res-static.hc-cdn.cn/cloudbu-site/public/new-product-icon/BusinessApplications/Domains.png',
                            'alt': '域名注册服务',
                            'style': 'width: 60px; height: 60px; margin-bottom: 10px;',
                          },
                        },
                        {
                          'componentName': 'h4',
                          'id': 'd6e7f8g9',
                          'props': {
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                          'children': '域名注册服务',
                        },
                        {
                          'componentName': 'p',
                          'id': 'h0i1j2k3',
                          'props': {
                            'style': 'font-size: 14px; color: #666;',
                          },
                          'children': '适用于网站建设、域名投资等场景',
                        },
                      ],
                    },
                    {
                      'componentName': 'div',
                      'id': 'l4m5n6o7',
                      'props': {
                        'style':
                          'width: 25%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;',
                      },
                      'children': [
                        {
                          'componentName': 'img',
                          'id': 'p8q9r0s1',
                          'props': {
                            'src':
                              'https://res-static.hc-cdn.cn/cloudbu-site/public/new-product-icon/BusinessApplications/mail0918.png',
                            'alt': '华为云企业邮箱',
                            'style': 'width: 60px; height: 60px; margin-bottom: 10px;',
                          },
                        },
                        {
                          'componentName': 'h4',
                          'id': 't2u3v4w5',
                          'props': {
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                          'children': '华为云企业邮箱',
                        },
                        {
                          'componentName': 'p',
                          'id': 'x6y7z8a9',
                          'props': {
                            'style': 'font-size: 14px; color: #666;',
                          },
                          'children': '免费试用，无限容量，全球畅邮',
                        },
                      ],
                    },
                    {
                      'componentName': 'div',
                      'id': 'b0c1d2e3',
                      'props': {
                        'style':
                          'width: 25%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;',
                      },
                      'children': [
                        {
                          'componentName': 'img',
                          'id': 'f4g5h6i7',
                          'props': {
                            'src':
                              'https://res-static.hc-cdn.cn/cloudbu-site/public/new-product-icon/BusinessApplications/Cloudsite.png',
                            'alt': '企业门户（原云速建站）',
                            'style': 'width: 60px; height: 60px; margin-bottom: 10px;',
                          },
                        },
                        {
                          'componentName': 'h4',
                          'id': 'j8k9l0m1',
                          'props': {
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                          'children': '企业门户（原云速建站）',
                        },
                        {
                          'componentName': 'p',
                          'id': 'n2o3p4q5',
                          'props': {
                            'style': 'font-size: 14px; color: #666;',
                          },
                          'children': '无需代码，一键拖拽，3000+模板随心选',
                        },
                      ],
                    },
                    {
                      'componentName': 'div',
                      'id': 'r6s7t8u9',
                      'props': {
                        'style':
                          'width: 25%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;',
                      },
                      'children': [
                        {
                          'componentName': 'img',
                          'id': 'v0w1x2y3',
                          'props': {
                            'src':
                              'https://res-static.hc-cdn.cn/cloudbu-site/china/zh-cn/yunying/new-home/markplace/home_icon_14.svg',
                            'alt': '财税卫士',
                            'style': 'width: 60px; height: 60px; margin-bottom: 10px;',
                          },
                        },
                        {
                          'componentName': 'h4',
                          'id': 'z4a5b6c7',
                          'props': {
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                          'children': '财税卫士',
                        },
                        {
                          'componentName': 'p',
                          'id': 'd8e9f0g1',
                          'props': {
                            'style': 'font-size: 14px; color: #666;',
                          },
                          'children': '智能财税风控检测软件，助力企业合规',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              'componentName': 'TiTab',
              'id': 'h2i3j4k5',
              'props': {
                'header': '企业初创',
                'id': 'tab2',
              },
              'children': [],
            },
            {
              'componentName': 'TiTab',
              'id': 'l6m7n8o9',
              'props': {
                'header': '企业营销',
                'id': 'tab3',
              },
              'children': [],
            },
            {
              'componentName': 'TiTab',
              'id': 'p0q1r2s3',
              'props': {
                'header': '企业办公',
                'id': 'tab4',
              },
              'children': [],
            },
          ],
        },
        {
          'componentName': 'div',
          'id': 't4u5v6w7',
          'props': {
            'style': 'text-align: center; margin-top: 20px;',
          },
          'children': [
            {
              'componentName': 'a',
              'id': 'x8y9z0a1',
              'props': {
                'style': 'font-size: 16px; color: #1890ff; text-decoration: none;',
                'href': '#',
              },
              'children': '查看企业应用中心 >',
            },
          ],
        },
      ],
    },
  ],
  'dataSource': {
    'list': [],
  },
  'methods': {},
  'bridge': {
    'imports': [],
  },
  'state': {},
  'inputs': [],
  'outputs': [],
  'id': 'body',
};

export const paginationSchema = {
  'componentName': 'Page',
  'props': {
    'className': 'page-base-style',
  },
  'css': '.page-base-style {padding: 24px;background: #FFFFFF;}',
  'children': [
    {
      'componentName': 'TiTable',
      'props': {
        'srcData': {
          'type': 'JSExpression',
          'value': 'this.state.srcData',
        },
        'displayedData': {
          'type': 'JSExpression',
          'model': true,
          'value': 'this.state.displayedData',
        },
        'columns': {
          'type': 'JSExpression',
          'value': 'this.state.columns',
        },
      },
      'children': [
        {
          'componentName': 'table',
          'children': [
            {
              'componentName': 'thead',
              'children': [
                {
                  'componentName': 'tr',
                  'children': [
                    {
                      'componentName': 'th',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'column.title',
                            },
                          },
                        },
                      ],
                      'loop': {
                        'type': 'JSExpression',
                        'value': 'this.state.columns',
                      },
                      'loopArgs': ['column'],
                    },
                  ],
                },
              ],
            },
            {
              'componentName': 'tbody',
              'children': [
                {
                  'componentName': 'tr',
                  'children': [
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.id',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.name',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.department',
                            },
                          },
                        },
                      ],
                    },
                    {
                      'componentName': 'td',
                      'children': [
                        {
                          'componentName': 'Text',
                          'props': {
                            'text': {
                              'type': 'JSExpression',
                              'value': 'row.email',
                            },
                          },
                        },
                      ],
                    },
                  ],
                  'loop': {
                    'type': 'JSExpression',
                    'value': 'this.state.displayedData',
                  },
                  'loopArgs': ['row'],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      'componentName': 'TiPagination',
      'props': {
        'currentPage': {
          'type': 'JSExpression',
          'value': 'this.state.currentPage',
        },
        'pageSize': {
          'type': 'JSExpression',
          'value': 'this.state.pageSize',
        },
        'total': {
          'type': 'JSExpression',
          'value': 'this.state.total',
        },
        'currentPageChange': {
          'type': 'JSFunction',
          'value': 'function(page) { this.state.currentPage = page }',
        },
        'pageSizeChange': {
          'type': 'JSFunction',
          'value': 'function(size) { this.state.pageSize = size }',
        },
      },
    },
  ],
  'state': {
    'currentPage': 1,
    'pageSize': 10,
    'total': 100,
    'columns': [
      { 'field': 'id', 'title': 'ID' },
      { 'field': 'name', 'title': '姓名' },
      { 'field': 'department', 'title': '部门' },
      { 'field': 'email', 'title': '邮箱' },
    ],
    'srcData': {
      'data': [
        { 'id': '1', 'name': '张三', 'department': 'HR', 'email': 'zhangsan@test.com' },
        { 'id': '2', 'name': '李四', 'department': '技术部', 'email': 'lisi@test.com' },
        { 'id': '3', 'name': '王五', 'department': '市场部', 'email': 'wangwu@test.com' },
      ],
    },
    'displayedData': [],
  },
  'id': 'body',
};

export const examples = [
  { name: '双向绑定的表单', schema: formSchema },
  { name: '信息展示卡片', schema: infoCardSchema },
  { name: '表格卡片', schema: gridSchema },
  { name: 'Tabs卡片', schema: tabsSchema },
  { name: '分页表格', schema: paginationSchema },
];
