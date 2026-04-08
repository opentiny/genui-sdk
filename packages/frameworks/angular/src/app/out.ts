
import { Component } from '@angular/core';
import { TiButtonModule,TiSelectModule,TiTextModule,TiTabModule,TiTableModule,TiCardModule,TiFormfieldModule,TiDateModule,TiTextareaModule,TiRadioModule,TiCheckboxModule } from '@opentiny/ng';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  template: `
    <div>
      <div       >
        <h2    style="margin-bottom: 16px;"   >
        信息展示卡片
   </h2><img    src="https://tinyengine-assets.obs.cn-north-4.myhuaweicloud.com/files/designer-default-icon.jpg" alt="示例图片" style="width: 100%; max-width: 300px; display: block; margin: 0 auto 16px;"   >
        
   <span    style="color:red"   >
        {{state.obj.name}}
   </span><button  *ngFor="let item of [ '按钮1', '按钮2', '按钮3' ];let index = index" tiButton   (log)="__temp_method_mck7yq1avgs($event)" >
        <span      (click)="__temp_method_nxkcy2f3etn({item,index})($event)" >
        {{item + '序号' + index}}
   </span>
   </button><ti-select    [options]="[ { label: '选项1', value: '选项1' }, { label: '选项2', value: '选项2' }, { label: '选项3', value: '选项3' } ]" [ngModel]="state.selectValue" [placeholder]="'请选择国家'"  (blur)="__temp_method_vvxx5agwuw()" (ngModelChange)="__temp_method_0bv4ln9tg95v($event)" >
        
   </ti-select><input   tiText placeholder="请输入" [(ngModel)]="state.obj.name"  >
        
   <input     [(ngModel)]="state.inputValue"  >
        
   <h3    style="margin-bottom: 8px;"   >
        无序列表
   </h3><ul    style="margin-bottom: 16px;"   >
        <li       >
        无序列表项1
   </li><li       >
        无序列表项2
   </li><li       >
        无序列表项3
   </li>
   </ul><h3    style="margin-bottom: 8px;"   >
        有序列表
   </h3><ol    style="margin-bottom: 16px;"   >
        <li       >
        有序列表项1
   </li><li       >
        有序列表项2
   </li><li       >
        有序列表项3
   </li>
   </ol>
   </div><div    style="display: flex; flex-direction: column; gap: 16px; padding: 20px;"   >
        <h3    style="font-size: 16px; font-weight: bold; margin-bottom: 10px;"   >
        请选择兴趣爱好（可多选）
   </h3><ti-select    [options]="[
  {
    label: '阅读',
    value: 'reading'
  },
  {
    label: '运动',
    value: 'sports'
  },
  {
    label: '音乐',
    value: 'music'
  },
  {
    label: '旅行',
    value: 'travel'
  },
  {
    label: '烹饪',
    value: 'cooking'
  },
  {
    label: '摄影',
    value: 'photography'
  }
]" placeholder="请选择兴趣爱好" [multiple]="true" [clearable]="true" [(ngModel)]="state.selectedHobbies"  >
        
   </ti-select>
   </div><ti-tabs    activeTab="tab1" type="line"   >
        <ti-tab    header="基本信息" id="tab1" [active]="true"   >
        <div    style="padding: 20px;"   >
        <h4       >
        个人信息
   </h4><p       >
        这里显示基本信息内容
   </p>
   </div>
   </ti-tab><ti-tab    header="详细信息" id="tab2"   >
        <div    style="padding: 20px;"   >
        <h4       >
        详细资料
   </h4><p       >
        这里显示详细信息内容
   </p>
   </div>
   </ti-tab><ti-tab    header="设置" id="tab3"   >
        <div    style="padding: 20px;"   >
        <h4       >
        系统设置
   </h4><p       >
        这里显示设置选项
   </p>
   </div>
   </ti-tab>
   </ti-tabs><ti-table    [srcData]="state.srcData" [columns]="state.columns" size="medium" [(displayedData)]="state.displayedData"  >
        <table       >
        <thead       >
        <tr       >
        <th  *ngFor="let column of state.columns;"     >
        <span       >
        {{column.title}}
   </span>
   </th>
   </tr>
   </thead><tbody       >
        <tr  *ngFor="let row of state.displayedData;"     >
        <td       >
        <span       >
        {{row.id}}
   </span>
   </td><td       >
        <span       >
        {{row.name}}
   </span>
   </td><td       >
        <span       >
        {{row.department}}
   </span>
   </td><td       >
        <span       >
        {{row.email}}
   </span>
   </td>
   </tr>
   </tbody>
   </table>
   </ti-table><ti-card    header="员工信息表单" style="width: 500px; margin: 20px auto;"   >
        <ti-formfield    style="padding: 20px;"   >
        <ti-item    [label]="'姓名'" [required]="true" labelWidth="100px"   >
        <input   tiText placeholder="请输入姓名" [(ngModel)]="state.formData.name"  >
        
   
   </ti-item><ti-item    [label]="'邮箱'" [required]="true" labelWidth="100px"   >
        <input   tiText placeholder="请输入邮箱" [(ngModel)]="state.formData.email"  >
        
   
   </ti-item><ti-item    [label]="'电话'" labelWidth="100px"   >
        <input   tiText placeholder="请输入联系电话" [(ngModel)]="state.formData.phone"  >
        
   
   </ti-item><ti-item    [label]="'部门'" labelWidth="100px"   >
        <ti-select    placeholder="请选择部门" [options]="[
  {
    label: '技术部',
    value: 'tech'
  },
  {
    label: '市场部',
    value: 'marketing'
  },
  {
    label: '人事部',
    value: 'hr'
  },
  {
    label: '财务部',
    value: 'finance'
  }
]" [(ngModel)]="state.formData.department"  >
        
   </ti-select>
   </ti-item><ti-item    [label]="'职位'" labelWidth="100px"   >
        <input   tiText placeholder="请输入职位" [(ngModel)]="state.formData.position"  >
        
   
   </ti-item><ti-item    [label]="'入职日期'" labelWidth="100px"   >
        <input   tiDate placeholder="请选择日期" format="yyyy-MM-dd" [(ngModel)]="state.formData.joinDate"  >
        
   
   </ti-item><ti-item    [label]="'个人描述'" labelWidth="100px"   >
        <textarea   tiTextarea placeholder="请输入个人描述" [rows]="3" [(ngModel)]="state.formData.description"  >
        
   </textarea>
   </ti-item><ti-item    [label]="'性别'" [required]="true"   >
        <ti-radio-group    [items]="[
  {
    label: '男',
    value: 'male'
  },
  {
    label: '女',
    value: 'female'
  }
]" [(ngModel)]="state.formData.gender"  >
        
   </ti-radio-group>
   </ti-item><ti-item    [label]="'兴趣爱好'" [required]="false"   >
        <ti-checkbox-group    [items]="[
  {
    label: '阅读',
    value: 'reading'
  },
  {
    label: '运动',
    value: 'sports'
  },
  {
    label: '音乐',
    value: 'music'
  },
  {
    label: '旅行',
    value: 'travel'
  }
]" [(ngModel)]="state.formData.hobbies"  >
        
   </ti-checkbox-group>
   </ti-item><ti-item    [label]="'协议同意'" [required]="true"   >
        <input   tiCheckbox type="checkbox" label="我已阅读并同意相关协议" [(ngModel)]="state.formData.agreement"  >
        
   
   </ti-item><div    style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;"   >
        <button   tiButton color="default"  (click)="handleReset()" >
        重置
   </button><button   tiButton color="primary"  (click)="handleSubmit()" >
        提交
   </button>
   </div>
   </ti-formfield>
   </ti-card>
    </div>
    `,
  styles: [''],
  imports: [TiButtonModule,TiSelectModule,TiTextModule,TiTabModule,TiTableModule,TiCardModule,TiFormfieldModule,TiDateModule,TiTextareaModule,TiRadioModule,TiCheckboxModule,CommonModule,FormsModule],
  standalone: true,
})
export class AutoGenComponent {
  public state: any = {
  inputValue: "输入框默认值",
  selectValue: {},
  obj: {
    name: "张三"
  },
  selectedHobbies: [],
  formData: {
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    joinDate: null,
    description: "",
    gender: "",
    agreement: false,
    hobbies: []
  },
  srcData: {
    data: [
      {
        id: "001",
        name: "张三",
        department: "技术部",
        email: "zhangsan@example.com"
      },
      {
        id: "002",
        name: "李四",
        department: "市场部",
        email: "lisi@example.com"
      },
      {
        id: "003",
        name: "王五",
        department: "人事部",
        email: "wangwu@example.com"
      },
      {
        id: "004",
        name: "赵六",
        department: "财务部",
        email: "zhaoliu@example.com"
      }
    ]
  },
  displayedData: [],
  columns: [
    {
      field: "id",
      title: "ID"
    },
    {
      field: "name",
      title: "姓名"
    },
    {
      field: "department",
      title: "部门"
    },
    {
      field: "email",
      title: "邮箱"
    }
  ]
};

  public handleReset(){
    this.state.formData = { name: '', email: '', phone: '', department: '', position: '', joinDate: null, description: '', gender: '', agreement: false, hobbies: [] } 
  }
public handleSubmit(){
    console.log('表单提交数据:', this.state.formData) 
  }
public __temp_method_mck7yq1avgs(data: any){
    console.log('log', data) 
  }
public __temp_method_nxkcy2f3etn(scope: any){
   
      const {item,index} = scope;
      return (event: any) => { console.log('onClick', event, item, index); if (index=== 2) {console.log(this.state)} };
    
  }
public __temp_method_vvxx5agwuw(){
    console.log('onBlur') 
  }
public __temp_method_0bv4ln9tg95v(data: any){
    console.log('onNgModelChange'), this.state.selectValue = data 
  }
}


