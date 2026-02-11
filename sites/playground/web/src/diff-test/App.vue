<template>
  <div class="demo-container">
    <div class="input-group">
      <button @click="changeSchema">改变</button>
    </div>
    <GenuiRenderer :content="schema" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const schema1 = `{
  "state": {
    "tableData": [
      {
        "id": "1",
        "name": "张三",
        "department": "技术部",
        "position": "前端工程师",
        "joinDate": "2022-03-15",
        "status": "在职"
      },
      {
        "id": "2",
        "name": "李四",
        "department": "产品部",
        "position": "产品经理",
        "joinDate": "2021-08-22",
        "status": "在职"
      },
      {
        "id": "3",
        "name": "王五",
        "department": "设计部",
        "position": "UI设计师",
        "joinDate": "2023-01-10",
        "status": "在职"
      },
      {
        "id": "4",
        "name": "赵六",
        "department": "市场部",
        "position": "市场专员",
        "joinDate": "2020-11-05",
        "status": "离职"
      },
      {
        "id": "5",
        "name": "钱七",
        "department": "技术部",
        "position": "后端工程师",
        "joinDate": "2022-07-30",
        "status": "在职"
      }
    ]
  },
  "methods": {
    "handleEdit": {
      "type": "JSFunction",
      "value": "function(row) { this.callAction('saveState'); this.callAction('continueChat', { message: \`编辑员工：\${row.name}\` }); }"
    },
    "handleDelete": {
      "type": "JSFunction",
      "value": "function(row) { this.callAction('saveState'); this.callAction('continueChat', { message: \`删除员工：\${row.name}\` }); }"
    }
  },
  "componentName": "Page",
  "props": {
    "style": "width: 100%; padding: 20px;"
  },
  "children": [
    {
      "componentName": "TinyCard",
      "children": [
        {
          "componentName": "h2",
          "props": {
            "style": "margin-bottom: 20px;"
          },
          "children": "员工信息表"
        },
        {
          "componentName": "TinyGrid",
          "props": {
            "data": {
              "type": "JSExpression",
              "value": "this.state.tableData"
            },
            "columns": [
              {
                "type": "index",
                "width": 60,
                "title": "序号"
              },
              {
                "field": "name",
                "title": "姓名",
                "width": 100
              },
              {
                "field": "department",
                "title": "部门",
                "width": 120
              },
              {
                "field": "position",
                "title": "职位",
                "width": 120
              },
              {
                "field": "joinDate",
                "title": "入职日期",
                "width": 120
              },
              {
                "field": "status",
                "title": "状态",
                "width": 100
              },
              {
                "title": "操作",
                "width": 150,
                "slots": {`
const schema2 = `{
  "state": {
    "tableData": [
      {
        "id": "1",
        "name": "张三",
        "department": "技术部",
        "position": "前端工程师",
        "joinDate": "2022-03-15",
        "status": "在职"
      },
      {
        "id": "2",
        "name": "李四",
        "department": "产品部",
        "position": "产品经理",
        "joinDate": "2021-08-22",
        "status": "在职"
      },
      {
        "id": "3",
        "name": "王五",
        "department": "设计部",
        "position": "UI设计师",
        "joinDate": "2023-01-10",
        "status": "在职"
      },
      {
        "id": "4",
        "name": "赵六",
        "department": "市场部",
        "position": "市场专员",
        "joinDate": "2020-11-05",
        "status": "离职"
      },
      {
        "id": "5",
        "name": "钱七",
        "department": "技术部",
        "position": "后端工程师",
        "joinDate": "2022-07-30",
        "status": "在职"
      }
    ]
  },
  "methods": {
    "handleEdit": {
      "type": "JSFunction",
      "value": "function(row) { this.callAction('saveState'); this.callAction('continueChat', { message: \`编辑员工：\${row.name}\` }); }"
    },
    "handleDelete": {
      "type": "JSFunction",
      "value": "function(row) { this.callAction('saveState'); this.callAction('continueChat', { message: \`删除员工：\${row.name}\` }); }"
    }
  },
  "componentName": "Page",
  "props": {
    "style": "width: 100%; padding: 20px;"
  },
  "children": [
    {
      "componentName": "TinyCard",
      "children": [
        {
          "componentName": "h2",
          "props": {
            "style": "margin-bottom: 20px;"
          },
          "children": "员工信息表"
        },
        {
          "componentName": "TinyGrid",
          "props": {
            "data": {
              "type": "JSExpression",
              "value": "this.state.tableData"
            },
            "columns": [
              {
                "type": "index",
                "width": 60,
                "title": "序号"
              },
              {
                "field": "name",
                "title": "姓名",
                "width": 100
              },
              {
                "field": "department",
                "title": "部门",
                "width": 120
              },
              {
                "field": "position",
                "title": "职位",
                "width": 120
              },
              {
                "field": "joinDate",
                "title": "入职日期",
                "width": 120
              },
              {
                "field": "status",
                "title": "状态",
                "width": 100
              },
              {
                "title": "操作",
                "width": 150,
                "slots": {
                  "default": {
                    "type": "JSSlot",
                    "value": [{}, { "text": "test" }, {} `
let flag = true;
const schema = ref<any>(schema1);

const changeSchema = () => {
  schema.value = flag ? schema2 : schema1
  flag = !flag;
};

</script>

<style scoped>
.demo-container {
  padding: 16px;
  box-sizing: border-box;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
