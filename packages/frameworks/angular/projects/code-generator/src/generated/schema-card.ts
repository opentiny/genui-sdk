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
          <h2 style="text-align: center; margin-bottom: 24px;">员工信息登记表</h2>
          <ti-formfield labelWidth="120px">
            <ti-item [label]="'姓名'" [required]="true">
              <input tiText placeholder="请输入姓名" [(ngModel)]="state.formData.name" />
            </ti-item>
            <ti-item [label]="'邮箱'" [required]="true">
              <input tiText placeholder="请输入邮箱" [(ngModel)]="state.formData.email" />
            </ti-item>
            <ti-item [label]="'性别'">
              <ti-radio-group
                [(ngModel)]="state.formData.gender"
                [items]='[{"label":"男","value":"male"},{"label":"女","value":"female"}]'
              ></ti-radio-group>
            </ti-item>
            <ti-item [label]="'部门'">
              <ti-select
                placeholder="请选择部门"
                [(ngModel)]="state.formData.department"
                [options]='[{"label":"技术部","value":"tech"},{"label":"市场部","value":"marketing"},{"label":"人事部","value":"hr"},{"label":"财务部","value":"finance"}]'
              ></ti-select>
            </ti-item>
            <ti-item [label]="'入职日期'">
              <ti-date placeholder="请选择日期" format="yyyy-MM-dd" [(ngModel)]="state.formData.startDate"></ti-date>
            </ti-item>
            <ti-item [label]="' '">
              <input tiCheckbox type="checkbox" label="我同意用户协议" [(ngModel)]="state.formData.agreement" />
            </ti-item>
          </ti-formfield>
          <div style="display: flex; gap: 16px; margin-top: 24px; justify-content: center;">
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
      email: '',
      department: '',
      startDate: '',
      gender: '',
      agreement: false
    }
  }

  handleSubmit() {
    console.log(this.state.formData)
    this.callAction('continueChat', { message: '提交成功' })
  }

  handleReset() {
    this.state.formData = { name: '', email: '', department: '', startDate: '', gender: '', agreement: false }
  }

  callAction(name: string, params?: unknown): void {
    console.warn(
      `[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`,
      params
    )
  }
}
