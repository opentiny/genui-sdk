# 布局组件

白名单：`TinyCard`

```json
[
  {
    "name": "卡片组件",
    "component": "TinyCard",
    "description": "强大卡片组件，用于包裹展示内容。",
    "schema": {
      "properties": [
        {
          "property": "auto-width",
          "description": "卡片的宽度是否自动撑开，设置后将不再给卡片设置固定宽度"
        },
        {
          "property": "type",
          "description": "设置卡片类型,可选值为\"text\",  \"image\",  \"video\",  \"logo\", 默认是\"text\""
        },
        {
          "property": "src",
          "description": "图片或者视频的地址"
        },
        {
          "property": "title",
          "description": "卡片的标题,字号比正文略大，比h3小"
        }
      ],
      "events": {},
      "slots": {}
    }
  }
]
```
