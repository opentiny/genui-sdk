# 基础元素

白名单：`a`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `p`, `ol`, `ul`, `li`, `div`, `video`, `label`, `Img`, `Slot`, `Text`, `TinyIcon`

```json
[
  {
    "name": "提示框",
    "component": "a",
    "description": "链接",
    "schema": {
      "properties": [
        {
          "property": "children",
          "description": "类型"
        },
        {
          "property": "href",
          "description": "指定链接的 URL"
        },
        {
          "property": "target",
          "description": "指定链接的打开方式，例如在当前窗口中打开或在新窗口中打开。"
        },
        {
          "property": "attributes3",
          "description": "原生属性"
        }
      ],
      "events": {},
      "slots": {}
    }
  },
  {
    "name": "段落",
    "component": "p",
    "description": "段落",
    "schema": {
      "properties": [
        {
          "property": "children",
          "description": "类型"
        },
        {
          "property": "attributes3",
          "description": "原生属性"
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "视频",
    "component": "video",
    "description": "视频",
    "schema": {
      "properties": [
        {
          "property": "src",
          "description": "视频的 URL"
        },
        {
          "property": "width",
          "description": "视频播放器的宽度"
        },
        {
          "property": "height",
          "description": "视频播放器的高度"
        },
        {
          "property": "controls",
          "description": "是否显示控件"
        },
        {
          "property": "autoplay",
          "description": "是否马上播放"
        },
        {
          "property": "attributes3",
          "description": "原生属性"
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "Img",
    "component": "Img",
    "schema": {
      "properties": [
        {
          "property": "src",
          "description": "src路径",
          "type": "string"
        },
        {
          "property": "attributes3",
          "description": "原生属性"
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "Img",
    "component": "Img",
    "schema": {
      "properties": [
        {
          "property": "src",
          "description": "src路径",
          "type": "string"
        }
      ],
      "events": [
        {
          "event": "onClick",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击时触发的回调函数"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "Slot",
    "component": "Slot",
    "schema": {
      "properties": [
        {
          "property": "name",
          "description": "插槽名称",
          "type": "string"
        },
        {
          "property": "params",
          "description": "作用域参数",
          "type": "string"
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "Text",
    "component": "Text",
    "schema": {
      "properties": [
        {
          "property": "text",
          "description": "文本内容",
          "type": "string"
        }
      ],
      "events": [
        {
          "event": "onClick",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击时触发的回调函数"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "TinyIcon",
    "component": "TinyIcon",
    "description": "图标组件。可作独立节点：{\"componentName\":\"TinyIcon\",\"props\":{\"name\":\"IconDel\"}}。作为 TinyButton 的 icon 属性时必须使用 JSSlot：{\"icon\":{\"type\":\"JSSlot\",\"value\":[{\"componentName\":\"TinyIcon\",\"props\":{\"name\":\"IconDel\"}}]}}",
    "schema": {
      "properties": [
        {
          "property": "name",
          "description": "图标名称，仅允许使用：IconSearch（放大镜，搜索）、IconDel（垃圾桶，删除）、IconDelete（叉号 X，删除/清除）、IconEdit（铅笔，编辑）、IconPlus（加号）、IconPlusCircle（圆圈加号，新增）、IconMinusCircle（圆圈减号，减少）、IconClose（关闭 X）、IconSuccess（成功勾选）、IconWarning（警告）、IconError（错误）、IconInfo（信息）、IconCheck（勾选）、IconYes（确认勾）、IconCalendar（日历）、IconUser（用户/人物）、IconSetting（设置/齿轮）、IconDownload（下载）、IconUpload（上传）、IconRefresh（刷新循环箭头）、IconArrowDown（向下箭头）、IconArrowLeft（向左箭头）、IconArrowRight（向右箭头）、IconArrowUp（向上箭头）、IconPopup（横向三点，更多操作）、IconHelpCircle（圆圈问号，帮助）、IconTime（时钟，时间）、IconCopy（重叠两页，复制）、IconSave（磁盘，保存）、IconFilter（漏斗，筛选）、IconClearFilter（清除筛选）、IconEyeopen（睁眼，可见）、IconEyeclose（闭眼，隐藏）、IconLock（锁，锁定）、IconUnlock（开锁，解锁）、IconLink（链条，链接）、IconAttachment（回形针，附件）、IconLoading（加载旋转）、IconStarO（空心星，收藏）、IconMail（信封，邮件）、IconPicture（图片/风景框）、IconFolder（文件夹）、IconExport（导出）、IconImport（导入）、IconSort（上下箭头，排序）、IconExpand（展开）、IconFullscreenLeft（对角外扩箭头，全屏）、IconMinscreenLeft（对角内收箭头，退出全屏）、IconShare（分享）、IconLocation（定位图钉）、IconMessageCircle（圆形消息气泡）、IconDocument（文档）、IconPublicHome（房屋轮廓，首页/主页）、IconText（带折角文档纸，文字内容）、IconTaskCooperation（三圆点三角网络，协作/任务协同）",
          "type": "string"
        }
      ],
      "events": [
        {
          "event": "onClick",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击时触发的回调函数"
        }
      ],
      "slots": {}
    }
  }
]
```
