import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import {
  TiCardModule,
  TiFormfieldModule,
  TiTextModule,
  TiRadioModule,
  TiSelectModule,
  TiDateModule,
  TiCheckboxModule,
  TiButtonModule
} from '@opentiny/ng'

@Component({
  selector: 'app-schema-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TiCardModule,
    TiFormfieldModule,
    TiTextModule,
    TiRadioModule,
    TiSelectModule,
    TiDateModule,
    TiCheckboxModule,
    TiButtonModule
  ],
  template: `
      <div>
        <ti-card>
          <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 24px; text-align: center;">员工信息登记表</h3>
          <ti-formfield labelWidth="100px">
            <ti-item [label]="'姓名'" [required]="true">
              <input tiText placeholder="请输入姓名" [(ngModel)]="state.formData.name" />
            </ti-item>
            <ti-item [label]="'性别'" [required]="true">
              <ti-radio-group [(ngModel)]="state.formData.gender" [items]="state.genderOptions"></ti-radio-group>
            </ti-item>
            <ti-item [label]="'部门'" [required]="true">
              <ti-select
                placeholder="请选择部门"
                [(ngModel)]="state.formData.department"
                [options]="state.departmentOptions"
              ></ti-select>
            </ti-item>
            <ti-item [label]="'出生日期'" [required]="true">
              <ti-date placeholder="请选择日期" format="yyyy-MM-dd" [(ngModel)]="state.formData.birthDate"></ti-date>
            </ti-item>
            <ti-item [label]="'邮箱'" [required]="true">
              <input tiText placeholder="请输入邮箱地址" [(ngModel)]="state.formData.email" />
            </ti-item>
            <ti-item [label]="'协议'">
              <input
                tiCheckbox
                type="checkbox"
                label="我已阅读并同意《员工信息收集协议》"
                [(ngModel)]="state.formData.agreement"
              />
            </ti-item>
          </ti-formfield>
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
            <button tiButton color="primary" (click)="handleSubmit()">提交</button>
            <button tiButton color="default" (click)="handleReset()">重置</button>
          </div>
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
      birthDate: '',
      email: '',
      agreement: false
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
    departmentOptions: [
      {
        label: '技术部',
        value: 'tech'
      },
      {
        label: '市场部',
        value: 'market'
      },
      {
        label: '人事部',
        value: 'hr'
      },
      {
        label: '财务部',
        value: 'finance'
      }
    ]
  }

  handleSubmit() {
    if (
      !this.state.formData.name ||
      !this.state.formData.gender ||
      !this.state.formData.department ||
      !this.state.formData.birthDate ||
      !this.state.formData.email
    ) {
      return
    }
    if (!this.state.formData.agreement) {
      return
    }
    this.callAction('saveState')
    this.callAction('continueChat', { message: '提交表单' })
  }

  handleReset() {
    this.state.formData = { name: '', gender: '', department: '', birthDate: '', email: '', agreement: false }
  }

  callAction(name: string, params?: unknown): void {
    console.warn(
      `[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`,
      params
    )
  }
}
