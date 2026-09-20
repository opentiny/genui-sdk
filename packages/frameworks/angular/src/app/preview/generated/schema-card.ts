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
  TiDateRangeModule,
  TiCheckboxModule,
  TiTextareaModule,
  TiRateModule,
  TiSliderModule,
  TiUploadModule,
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
    TiDateRangeModule,
    TiCheckboxModule,
    TiTextareaModule,
    TiRateModule,
    TiSliderModule,
    TiUploadModule,
    TiSwitchModule,
    TiButtonModule,
    TiIconModule,
    TiTableModule,
    TiPaginationModule
  ],
  template: `
      <div>
        <ti-card>
          <h2 style="font-size: 22px; font-weight: bold; margin-bottom: 24px; text-align: center;">综合信息管理平台</h2>
          <ti-tabs>
            <ti-tab header="用户注册" id="tab1" [active]="true">
              <ti-formfield labelWidth="100px">
                <ti-item [label]="'用户名'" [required]="true">
                  <input tiText placeholder="请输入用户名" [(ngModel)]="state.formData.username" />
                </ti-item>
                <ti-item [label]="'密码'" [required]="true">
                  <input tiText placeholder="请输入密码" [(ngModel)]="state.formData.password" />
                </ti-item>
                <ti-item [label]="'性别'">
                  <ti-radio-group [items]="state.genderOptions" [(ngModel)]="state.formData.gender"></ti-radio-group>
                </ti-item>
                <ti-item [label]="'城市'">
                  <ti-select
                    placeholder="请选择城市"
                    [options]="state.cityOptions"
                    [clearable]="true"
                    [(ngModel)]="state.formData.city"
                  ></ti-select>
                </ti-item>
                <ti-item [label]="'出生日期'">
                  <ti-date placeholder="请选择日期" format="yyyy-MM-dd" [(ngModel)]="state.formData.birthday"></ti-date>
                </ti-item>
                <ti-item [label]="'日期范围'">
                  <ti-date-range
                    placeholder="请选择日期范围"
                    format="yyyy-MM-dd"
                    [(ngModel)]="state.formData.range"
                  ></ti-date-range>
                </ti-item>
                <ti-item [label]="'技能标签'">
                  <ti-checkbox-group [items]="state.skillOptions" [(ngModel)]="state.formData.skills"></ti-checkbox-group>
                </ti-item>
                <ti-item [label]="'个人简介'">
                  <textarea
                    tiTextarea
                    placeholder="请输入个人简介"
                    [rows]="3"
                    [maxlength]="200"
                    [(ngModel)]="state.formData.bio"
                  ></textarea>
                </ti-item>
                <ti-item [label]="'评分'">
                  <ti-rate [(ngModel)]="state.formData.rating"></ti-rate>
                </ti-item>
                <ti-item [label]="'音量'">
                  <ti-slider [min]="0" [max]="100" [step]="1" [(ngModel)]="state.formData.volume"></ti-slider>
                </ti-item>
                <ti-item [label]="'头像上传'">
                  <ti-upload
                    url="/api/upload"
                    accept="image/*"
                    (successItems)="handleUploadSuccess($event)"
                    (errorItems)="handleUploadError($event)"
                  ></ti-upload>
                </ti-item>
                <ti-item [label]="'消息通知'">
                  <ti-switch [(ngModel)]="state.formData.notification" offText="关"></ti-switch>
                </ti-item>
                <ti-item [label]="' '">
                  <input
                    tiCheckbox
                    type="checkbox"
                    label="我已阅读并同意《用户服务协议》"
                    [(ngModel)]="state.formData.agreement"
                  />
                </ti-item>
                <ti-item [label]="' '">
                  <div style="display: flex; gap: 16px;">
                    <button tiButton color="primary" size="middle" [icon]="true" (click)="handleSubmit()">
                      <span>提交</span>
                      <ti-icon name="checkmark"></ti-icon>
                    </button>
                    <button tiButton color="default" size="middle" (click)="handleReset()">重置</button>
                  </div>
                </ti-item>
              </ti-formfield>
            </ti-tab>
            <ti-tab header="员工列表" id="tab2">
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="font-size: 16px; font-weight: bold;">员工信息表</h3>
                  <button tiButton color="primary" size="small" [onlyIcon]="true">
                    <ti-icon name="add"></ti-icon>
                  </button>
                </div>
                <ti-table [srcData]="state.srcData" [(displayedData)]="state.displayedData" [columns]="state.columns">
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
                        <td>{{ row.status }}</td>
                      </tr>
                    </tbody>
                  </table>
                </ti-table>
                <ti-pagination
                  [currentPage]="state.currentPage"
                  [pageSize]="state.pageSizeConfig"
                  [totalNumber]="state.total"
                  (currentPageChange)="__handle1($event)"
                  (pageNumChange)="__handle2($event)"
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
      username: '',
      password: '',
      gender: '',
      city: '',
      birthday: '',
      range: [null, null],
      bio: '',
      skills: [],
      agreement: false,
      rating: 0,
      volume: 50,
      notification: false
    },
    genderOptions: [
      {
        label: '男',
        value: 'male'
      },
      {
        label: '女',
        value: 'female'
      }
    ],
    cityOptions: [
      {
        label: '北京',
        value: 'beijing'
      },
      {
        label: '上海',
        value: 'shanghai'
      },
      {
        label: '广州',
        value: 'guangzhou'
      },
      {
        label: '深圳',
        value: 'shenzhen'
      }
    ],
    skillOptions: [
      {
        label: 'JavaScript',
        value: 'js'
      },
      {
        label: 'TypeScript',
        value: 'ts'
      },
      {
        label: 'React',
        value: 'react'
      },
      {
        label: 'Vue',
        value: 'vue'
      },
      {
        label: 'Angular',
        value: 'angular'
      }
    ],
    srcData: {
      data: [
        {
          id: '1',
          name: '张三',
          department: '技术部',
          email: 'zhangsan@test.com',
          status: '在职'
        },
        {
          id: '2',
          name: '李四',
          department: '市场部',
          email: 'lisi@test.com',
          status: '在职'
        },
        {
          id: '3',
          name: '王五',
          department: '人事部',
          email: 'wangwu@test.com',
          status: '离职'
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
        title: 'ID'
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
        field: 'status',
        title: '状态'
      }
    ],
    currentPage: 1,
    pageSizeConfig: {
      options: [5, 10, 20],
      size: 5
    },
    total: 3,
    activeTab: 'tab1'
  }

  __handle1(currentPage?: any) {
    this.state.currentPage = currentPage
  }
  __handle2(event?: any) {
    this.state.pageSizeConfig = { ...this.state.pageSizeConfig, size: event.size }
  }

  handleSubmit() {
    console.log(this.state.formData)
    this.callAction('continueChat', { message: '提交表单' })
  }

  handleReset() {
    this.state.formData = {
      username: '',
      password: '',
      gender: '',
      city: '',
      birthday: '',
      range: [null, null],
      bio: '',
      skills: [],
      agreement: false,
      rating: 0,
      volume: 50,
      notification: false
    }
  }

  handleUploadSuccess(file?: any) {
    console.log('上传成功:', file)
  }

  handleUploadError(file?: any) {
    console.log('上传失败:', file)
  }

  callAction(name: string, params?: unknown): void {
    console.warn(
      `[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`,
      params
    )
  }
}
