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
      'componentName': 'TinyForm',
      'props': {
        'model': {
          'type': 'JSExpression',
          'value': 'this.state.formData',
        },
        'labelPosition': 'top',
      },
      'children': [
        {
          'componentName': 'TinyFormItem',
          'props': {
            'label': '姓名',
            'prop': 'name',
            'required': true,
          },
          'children': [
            {
              'componentName': 'TinyInput',
              'props': {
                'placeholder': '请输入',
                'modelValue': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.name',
                },
              },
            },
          ],
        },
        {
          'componentName': 'TinyFormItem',
          'props': {
            'label': '工号',
            'prop': 'id',
            'required': true,
          },
          'children': [
            {
              'componentName': 'TinyInput',
              'props': {
                'disabled': true,
                'modelValue': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.id',
                },
                'onChange': {
                  'type': 'JSFunction',
                  'value': 'fucntion() { console.log(this.state.formData) }',
                },
              },
            },
          ],
        },
        {
          'componentName': 'TinyFormItem',
          'props': {
            'label': '性别',
            'prop': 'sex',
          },
          'children': [
            {
              'componentName': 'TinyRadioGroup',
              'props': {
                'options': [
                  {
                    'text': '男',
                    'label': '男',
                  },
                  {
                    'text': '女',
                    'label': '女',
                  },
                ],
                'modelValue': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.sex',
                },
              },
            },
          ],
        },
        {
          'componentName': 'TinyFormItem',
          'props': {
            'label': '部门',
            'prop': 'depart',
            'required': true,
          },
          'children': [
            {
              'componentName': 'TinySelect',
              'props': {
                'placeholder': '请选择',
                'modelValue': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.depart',
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
                'onChange': {
                  'type': 'JSExpression',
                  'value': 'this.departChange',
                },
              },
            },
          ],
        },
        {
          'componentName': 'TinyFormItem',
          'props': {
            'label': '入职日期',
            'prop': 'date',
          },
          'children': [
            {
              'componentName': 'TinyDatePicker',
              'props': {
                'placeholder': '请输入',
                'disabled': true,
                'modelValue': {
                  'type': 'JSExpression',
                  'model': true,
                  'value': 'this.state.formData.date',
                },
              },
            },
          ],
        },
        {
          'componentName': 'TinyFormItem',
          'props': {
            'label': '',
          },
          'children': [
            {
              'componentName': 'TinyButton',
              'props': {
                'text': '确认',
              },
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
      'componentName': 'Text',
      'props': {
        'style': 'font-size: 14px;font-weight: bold;line-height:2;margin-bottom:20px;display:block;',
        'text': '员工信息详情',
      },
    },
    {
      'componentName': 'div',
      'props': {
        'className': 'component-base-style',
        'style': 'width: 374px; background: #f5f5f5;border-radius: 12px;line-height:2;font-size:14px;padding: 20px 0;',
      },
      'children': [
        {
          'componentName': 'TinyLayout',
          'props': { 'className': 'component-base-style' },
          'children': [
            {
              'componentName': 'TinyRow',
              'children': [
                {
                  'componentName': 'TinyCol',
                  'props': { 'span': 3 },
                  'children': [{ 'componentName': 'Text', 'props': { 'text': '姓名' } }],
                },
                {
                  'componentName': 'TinyCol',
                  'props': { 'span': 9 },
                  'children': [{ 'componentName': 'Text', 'props': { 'text': '张三' } }],
                },
              ],
            },
            {
              'componentName': 'TinyRow',
              'children': [
                {
                  'componentName': 'TinyCol',
                  'props': { 'span': 3 },
                  'children': [{ 'componentName': 'Text', 'props': { 'text': '电话' } }],
                },
                {
                  'componentName': 'TinyCol',
                  'props': { 'span': 9 },
                  'children': [
                    {
                      'componentName': 'Text',
                      'props': { 'text': '18856254558' },
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
      'componentName': 'TinyGrid',
      'props': {
        'columns': [
          { 'type': 'index', 'width': 60 },
          { 'field': 'name', 'title': '姓名' },
          { 'field': 'id', 'title': '工号' },
          { 'field': 'sex', 'title': '性别' },
          { 'field': 'department', 'title': '部门' },
          { 'field': 'protocolStart', 'title': '入职日期' },
          { 'field': 'email', 'title': '邮箱' },
          {
            'title': '操作',
            'slots': {
              'default': {
                'type': 'JSSlot',
                'value': [
                  {
                    'componentName': 'div',
                    'id': '23324161',
                    'children': [
                      {
                        'componentName': 'TinyButton',
                        'props': {
                          'className': 'component-base-style',
                          'text': {
                            'type': 'JSExpression',
                            'value': '`编辑${row.name}`',
                          },
                        },
                        'children': [],
                        'id': '24392624',
                      },
                    ],
                  },
                ],
                'params': [
                  'row',
                ],
              },
            },
          },
        ],
        'data': [
          {
            'name': '李四',
            'id': '2',
            'sex': '女',
            'department': '技术部',
            'protocolStart': '2019-05-15',
            'email': 'lisi@test.com',
          },
        ],
        'className': 'component-base-style',
      },
    },
  ],
  'dataSource': { 'list': [] },
  'id': 'body',
};

export const tabsSchema = {
  'componentName': 'Page',
  'fileName': 'Untitleda',
  'css':
    '.page-base-style {\n  padding: 24px;background: #FFFFFF;\n}\n\n.block-base-style {\n  margin: 16px;\n}\n\n.component-base-style {\n  margin: 8px;\n}\n',
  'props': {
    'className': 'page-base-style',
  },
  'lifeCycles': {},
  'children': [
    {
      'componentName': 'CanvasFlexBox',
      'id': 'e9a7b6c5',
      'props': {
        'flexDirection': 'column',
        'justifyContent': 'center',
        'alignItems': 'center',
      },
      'children': [
        {
          'componentName': 'Text',
          'id': 'f2g3h4i5',
          'props': {
            'text': '降本增效，加速企业数字化转型',
            'style': 'font-size: 24px; font-weight: bold; margin-bottom: 20px;',
          },
        },
        {
          'componentName': 'TinyTabs',
          'id': 'j6k7l8m9',
          'props': {
            'modelValue': '精选推荐',
            'className': 'component-base-style',
          },
          'children': [
            {
              'componentName': 'TinyTabItem',
              'id': 'n0o1p2q3',
              'props': {
                'title': '精选推荐',
                'name': '精选推荐',
              },
              'children': [
                {
                  'componentName': 'CanvasFlexBox',
                  'id': 'r4s5t6u7',
                  'props': {
                    'flexDirection': 'row',
                    'justifyContent': 'space-around',
                    'alignItems': 'center',
                    'wrap': 'wrap',
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
                          'componentName': 'Text',
                          'id': 'd6e7f8g9',
                          'props': {
                            'text': '域名注册服务',
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                        },
                        {
                          'componentName': 'Text',
                          'id': 'h0i1j2k3',
                          'props': {
                            'text': '适用于网站建设、域名投资等场景',
                            'style': 'font-size: 14px; color: #666;',
                          },
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
                          'componentName': 'Text',
                          'id': 't2u3v4w5',
                          'props': {
                            'text': '华为云企业邮箱',
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                        },
                        {
                          'componentName': 'Text',
                          'id': 'x6y7z8a9',
                          'props': {
                            'text': '免费试用，无限容量，全球畅邮',
                            'style': 'font-size: 14px; color: #666;',
                          },
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
                          'componentName': 'Text',
                          'id': 'j8k9l0m1',
                          'props': {
                            'text': '企业门户（原云速建站）',
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                        },
                        {
                          'componentName': 'Text',
                          'id': 'n2o3p4q5',
                          'props': {
                            'text': '无需代码，一键拖拽，3000+模板随心选',
                            'style': 'font-size: 14px; color: #666;',
                          },
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
                          'componentName': 'Text',
                          'id': 'z4a5b6c7',
                          'props': {
                            'text': '财税卫士',
                            'style': 'font-size: 16px; font-weight: bold; margin-bottom: 5px;',
                          },
                        },
                        {
                          'componentName': 'Text',
                          'id': 'd8e9f0g1',
                          'props': {
                            'text': '智能财税风控检测软件，助力企业合规',
                            'style': 'font-size: 14px; color: #666;',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              'componentName': 'TinyTabItem',
              'id': 'h2i3j4k5',
              'props': {
                'title': '企业初创',
                'name': '企业初创',
              },
              'children': [],
            },
            {
              'componentName': 'TinyTabItem',
              'id': 'l6m7n8o9',
              'props': {
                'title': '企业营销',
                'name': '企业营销',
              },
              'children': [],
            },
            {
              'componentName': 'TinyTabItem',
              'id': 'p0q1r2s3',
              'props': {
                'title': '企业办公',
                'name': '企业办公',
              },
              'children': [],
            },
          ],
        },
        {
          'componentName': 'CanvasFlexBox',
          'id': 't4u5v6w7',
          'props': {
            'justifyContent': 'center',
            'marginTop': '20px',
          },
          'children': [
            {
              'componentName': 'Text',
              'id': 'x8y9z0a1',
              'props': {
                'text': '查看企业应用中心 >',
                'style': 'font-size: 16px;',
              },
            },
          ],
        },
      ],
    },
    {
      'componentName': 'CanvasFlexBox',
      'id': 'b7a4c9f2',
      'props': {
        'flexDirection': 'column',
        'justifyContent': 'center',
        'alignItems': 'center',
      },
      'children': [
        {
          'componentName': 'TinyCarousel',
          'id': 'e8d3a5b1',
          'props': {
            'height': '600px',
            'autoplay': true,
            'interval': 5000,
          },
          'children': [
            {
              'componentName': 'TinyCarouselItem',
              'props': {
                'title': 'carousel-item-b',
              },
              'children': [
                {
                  'componentName': 'div',
                  'props': {
                    'style': 'margin:10px 0 0 30px',
                  },
                  'id': '55c45252',
                },
              ],
              'id': '32322a23',
            },
          ],
        },
        {
          'componentName': 'CanvasFlexBox',
          'id': 'x8y9z0a1',
          'props': {
            'flexDirection': 'row',
            'justifyContent': 'space-around',
            'alignItems': 'center',
            'style': 'width: 100%; height: 80px; background-color: #f5f5f5;',
          },
          'children': [
            {
              'componentName': 'div',
              'id': 'b2c3d4e5',
              'props': {
                'style': 'display: flex; flex-direction: column; justify-content: center; align-items: center;',
              },
              'children': [
                {
                  'componentName': 'Text',
                  'id': 'f6g7h8i9',
                  'props': {
                    'text': '华为云618',
                    'style': 'font-size: 18px; font-weight: bold;',
                  },
                },
                {
                  'componentName': 'Text',
                  'id': 'j0k1l2m3',
                  'props': {
                    'text': '智惠行·云无忧',
                    'style': 'font-size: 14px; color: #666;',
                  },
                },
              ],
            },
            {
              'componentName': 'div',
              'id': 'n4o5p6q7',
              'props': {
                'style': 'display: flex; flex-direction: column; justify-content: center; align-items: center;',
              },
              'children': [
                {
                  'componentName': 'Text',
                  'id': 'r8s9t0u1',
                  'props': {
                    'text': '免费体验中心',
                    'style': 'font-size: 18px; font-weight: bold;',
                  },
                },
                {
                  'componentName': 'Text',
                  'id': 'v2w3x4y5',
                  'props': {
                    'text': '提供80+精选云产品，立即免费试用',
                    'style': 'font-size: 14px; color: #666;',
                  },
                },
              ],
            },
            {
              'componentName': 'div',
              'id': 'z6a7b8c9',
              'props': {
                'style': 'display: flex; flex-direction: column; justify-content: center; align-items: center;',
              },
              'children': [
                {
                  'componentName': 'Text',
                  'id': 'd0e1f2g3',
                  'props': {
                    'text': 'MaaS上线MCP',
                    'style': 'font-size: 18px; font-weight: bold;',
                  },
                },
                {
                  'componentName': 'Text',
                  'id': 'h4i5j6k7',
                  'props': {
                    'text': '解锁专属AI Agent，高效构建智能化应用场景',
                    'style': 'font-size: 14px; color: #666;',
                  },
                },
              ],
            },
            {
              'componentName': 'div',
              'id': 'l8m9n0o1',
              'props': {
                'style': 'display: flex; flex-direction: column; justify-content: center; align-items: center;',
              },
              'children': [
                {
                  'componentName': 'Text',
                  'id': 'p2q3r4s5',
                  'props': {
                    'text': '黄大年茶思屋',
                    'style': 'font-size: 18px; font-weight: bold;',
                  },
                },
                {
                  'componentName': 'Text',
                  'id': 't6u7v8w9',
                  'props': {
                    'text': '开放的科学与技术交流平台',
                    'style': 'font-size: 14px; color: #666;',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      'componentName': 'TinyCarousel',
      'props': {
        'height': '180px',
        'className': 'component-base-style',
      },
      'children': [
        {
          'componentName': 'TinyCarouselItem',
          'props': {
            'title': 'carousel-item-a',
          },
          'children': [
            {
              'componentName': 'div',
              'props': {
                'style': 'margin:10px 0 0 30px',
              },
              'id': '412223b3',
              'children': [
                {
                  'componentName': 'Img',
                  'props': {
                    'src': 'https://tinyengine-assets.obs.cn-north-4.myhuaweicloud.com/files/designer-default-icon.jpg',
                    'className': 'component-base-style',
                  },
                  'children': [],
                  'id': '23563383',
                },
              ],
            },
          ],
          'id': '65255135',
        },
        {
          'componentName': 'TinyCarouselItem',
          'props': {
            'title': 'carousel-item-b',
          },
          'children': [
            {
              'componentName': 'div',
              'props': {
                'style': 'margin:10px 0 0 30px',
              },
              'id': '64234622',
            },
          ],
          'id': 'd62c4365',
        },
      ],
      'id': '4243de46',
    },
    {
      'componentName': 'TinyTabs',
      'props': {
        'modelValue': 'first',
        'className': 'component-base-style',
      },
      'children': [
        {
          'componentName': 'TinyTabItem',
          'props': {
            'title': '标签页1',
            'name': 'first',
          },
          'children': [
            {
              'componentName': 'div',
              'props': {
                'style': 'margin:10px 0 0 30px',
              },
              'id': '3553655f',
            },
          ],
          'id': '53155552',
        },
        {
          'componentName': 'TinyTabItem',
          'props': {
            'title': '标签页2',
            'name': 'second',
          },
          'children': [
            {
              'componentName': 'div',
              'props': {
                'style': 'margin:10px 0 0 30px',
              },
              'id': '23b42cf6',
            },
          ],
          'id': '25244454',
        },
      ],
      'id': '24532395',
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

export const examples = [
  { name: '双向绑定的表单', schema: formSchema },
  { name: '信息展示卡片', schema: infoCardSchema },
  { name: '表格卡片', schema: gridSchema },
  { name: 'Tabs卡片', schema: tabsSchema },
];
