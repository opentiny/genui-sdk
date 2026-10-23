import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TiCardModule, TiTableModule } from '@opentiny/ng'

@Component({
  selector: 'app-schema-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TiCardModule, TiTableModule],
  template: `
      <div>
        <ti-card>
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">员工信息列表</h3>
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
                </tr>
              </tbody>
            </table>
          </ti-table>
        </ti-card>
      </div>
  `,
  styles: [``]
})
export class SchemaCardComponent {
  state = {
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
      }
    ],
    srcData: {
      data: [
        {
          id: '1',
          name: '张三',
          department: '人事部',
          email: 'zhangsan@test.com'
        },
        {
          id: '2',
          name: '李四',
          department: '技术部',
          email: 'lisi@test.com'
        },
        {
          id: '3',
          name: '王五',
          department: '市场部',
          email: 'wangwu@test.com'
        },
        {
          id: '4',
          name: '赵六',
          department: '财务部',
          email: 'zhaoliu@test.com'
        },
        {
          id: '5',
          name: '孙七',
          department: '人事部',
          email: 'sunqi@test.com'
        }
      ],
      state: {
        searched: false,
        sorted: false,
        paginated: false
      }
    },
    displayedData: []
  }
}
