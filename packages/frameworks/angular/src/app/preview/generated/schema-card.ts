import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import {
  TiCardModule,
  TiTabModule,
  TiFormfieldModule,
  TiTextModule,
  TiRadioModule,
  TiSelectModule,
  TiDateModule,
  TiTextareaModule,
  TiCheckboxModule,
  TiSliderModule,
  TiRateModule,
  TiSwitchModule,
  TiButtonModule,
  TiIconModule,
  TiTableModule,
  TiPaginationModule
} from '@opentiny/ng'

@Component({
  selector: 'app-schema-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TiCardModule,
    TiTabModule,
    TiFormfieldModule,
    TiTextModule,
    TiRadioModule,
    TiSelectModule,
    TiDateModule,
    TiTextareaModule,
    TiCheckboxModule,
    TiSliderModule,
    TiRateModule,
    TiSwitchModule,
    TiButtonModule,
    TiIconModule,
    TiTableModule,
    TiPaginationModule
  ],
  template: `
      <div>
        <ti-card>
          <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 24px; text-align: center;">员工信息管理系统</h2>
          <ti-tabs>
            <ti-tab header="信息录入" id="tab1" [active]="true">
              <div style="padding: 24px;">
                <ti-formfield labelPosition="left" labelWidth="100px">
                  <ti-item [label]="'姓名'" [required]="true">
                    <input tiText placeholder="请输入姓名" [(ngModel)]="state.formData.name" />
                  </ti-item>
                  <ti-item [label]="'性别'" [required]="true">
                    <ti-radio-group
                      [(ngModel)]="state.formData.gender"
                      [items]='[{"label":"男","value":"male"},{"label":"女","value":"female"}]'
                    ></ti-radio-group>
                  </ti-item>
                  <ti-item [label]="'部门'" [required]="true">
                    <ti-select
                      placeholder="请选择部门"
                      [(ngModel)]="state.formData.department"
                      [options]='[{"label":"技术部","value":"tech"},{"label":"市场部","value":"marketing"},{"label":"人事部","value":"hr"},{"label":"财务部","value":"finance"}]'
                    ></ti-select>
                  </ti-item>
                  <ti-item [label]="'入职日期'">
                    <ti-date placeholder="请选择日期" [(ngModel)]="state.formData.startDate" format="yyyy-MM-dd"></ti-date>
                  </ti-item>
                  <ti-item [label]="'邮箱'" [required]="true">
                    <input tiText placeholder="请输入邮箱" [(ngModel)]="state.formData.email" />
                  </ti-item>
                  <ti-item [label]="'个人简介'">
                    <textarea tiTextarea placeholder="请输入个人简介" [rows]="4" [(ngModel)]="state.formData.bio"></textarea>
                  </ti-item>
                  <ti-item [label]="'技能'">
                    <ti-checkbox-group
                      [(ngModel)]="state.formData.skills"
                      [items]='[{"label":"JavaScript","value":"js"},{"label":"Python","value":"python"},{"label":"Java","value":"java"},{"label":"Go","value":"go"}]'
                    ></ti-checkbox-group>
                  </ti-item>
                  <ti-item [label]="'熟练度'">
                    <ti-slider [(ngModel)]="state.formData.level" [min]="0" [max]="10" [step]="1"></ti-slider>
                  </ti-item>
                  <ti-item [label]="'评分'">
                    <ti-rate [(ngModel)]="state.rateValue" [count]="5" [ngModelChange]="handleRateChange"></ti-rate>
                  </ti-item>
                  <ti-item [label]="'同意协议'">
                    <ti-switch [(ngModel)]="state.formData.agreement"></ti-switch>
                  </ti-item>
                </ti-formfield>
                <div style="display: flex; justify-content: center; gap: 16px; margin-top: 24px;">
                  <button tiButton color="primary" size="middle" (click)="handleSubmit()">
                    <span>提交</span>
                    <ti-icon name="checkmark"></ti-icon>
                  </button>
                  <button tiButton color="default" size="middle">重置</button>
                </div>
              </div>
            </ti-tab>
            <ti-tab header="员工列表" id="tab2">
              <div style="padding: 24px;">
                <ti-table [srcData]="state.tableData" [(displayedData)]="state.displayedData" [columns]="state.columns">
                  <table>
                    <thead>
                      <tr>
                        <th *ngFor="let column of state.columns">{{ column.title }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of state.displayedData">
                        <td>{{ row.id }}</td>
                        <td>{{ row.name }}</td>
                        <td>{{ row.department }}</td>
                        <td>{{ row.email }}</td>
                        <td>{{ row.startDate }}</td>
                      </tr>
                    </tbody>
                  </table>
                </ti-table>
                <ti-pagination
                  [currentPage]="state.currentPage"
                  [pageSize]="state.pageSizeConfig"
                  [totalNumber]="state.total"
                  [currentPageChange]="handlePageChange"
                  [pageSizeChange]="handlePageSizeChange"
                ></ti-pagination>
              </div>
            </ti-tab>
          </ti-tabs>
        </ti-card>
      </div>
  `,
  styles: [``]
})
export class SchemaCardComponent {
  state = {
    formData: {
      name: '',
      gender: '',
      department: '',
      startDate: '',
      email: '',
      bio: '',
      skills: [],
      level: 0,
      agreement: false
    },
    tableData: {
      data: [
        {
          id: '1',
          name: '张三',
          department: '技术部',
          email: 'zhangsan@test.com',
          startDate: '2020-01-15'
        },
        {
          id: '2',
          name: '李四',
          department: '市场部',
          email: 'lisi@test.com',
          startDate: '2019-05-20'
        },
        {
          id: '3',
          name: '王五',
          department: '人事部',
          email: 'wangwu@test.com',
          startDate: '2021-03-10'
        }
      ],
      state: {
        searched: false,
        sorted: false,
        paginated: false
      }
    },
    displayedData: [],
    columns: [
      {
        field: 'id',
        title: '工号'
      },
      {
        field: 'name',
        title: '姓名'
      },
      {
        field: 'department',
        title: '部门'
      },
      {
        field: 'email',
        title: '邮箱'
      },
      {
        field: 'startDate',
        title: '入职日期'
      }
    ],
    currentPage: 1,
    pageSizeConfig: {
      options: [5, 10, 20, 50],
      size: 5
    },
    total: 3,
    activeTab: 'tab1',
    rateValue: 4
  }

  handleSubmit() {
    console.log(this.state.formData)
    this.callAction('continueChat', { message: '提交成功' })
  }

  handlePageChange(page) {
    this.state.currentPage = page
  }

  handlePageSizeChange(size) {
    this.state.pageSizeConfig = { ...this.state.pageSizeConfig, size: size }
  }

  handleRateChange(value) {
    this.state.rateValue = value
  }

  callAction(name: string, params?: unknown): void {
    console.warn(
      `[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`,
      params
    )
  }
}
