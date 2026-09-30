import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TiCardModule, TiTableModule, TiButtonModule } from '@opentiny/ng'

@Component({
  selector: 'app-schema-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TiCardModule, TiTableModule, TiButtonModule],
  template: `
      <div>
        <ti-card>
          <h3 style="margin-bottom: 16px;">订单管理</h3>
          <ti-table [srcData]="state.srcData" [(displayedData)]="state.displayedData" [columns]="state.columns">
            <table>
              <thead>
                <tr>
                  <th *ngFor="let column of state.columns">{{ column.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of state.displayedData">
                  <td>{{ row.orderNo }}</td>
                  <td>{{ row.customer }}</td>
                  <td>{{ row.amount }}</td>
                  <td>{{ row.status }}</td>
                  <td>
                    <button tiButton color="danger" size="small" (click)="__handle1(row)">{{ '删除 ' + row.orderNo }}</button>
                  </td>
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
    srcData: {
      data: [
        {
          orderNo: 'A001',
          customer: '张三',
          amount: 1280,
          status: '已发货'
        },
        {
          orderNo: 'A002',
          customer: '李四',
          amount: 3560,
          status: '待付款'
        },
        {
          orderNo: 'A003',
          customer: '王五',
          amount: 2400,
          status: '已完成'
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
        field: 'orderNo',
        title: '订单号'
      },
      {
        field: 'customer',
        title: '客户'
      },
      {
        field: 'amount',
        title: '金额'
      },
      {
        field: 'status',
        title: '状态'
      },
      {
        field: 'actions',
        title: '操作'
      }
    ]
  }

  __handle1(row?: any) {
    console.log(row.orderNo)
  }

  handleDelete(row?: any) {
    console.log(row.orderNo)
  }
}
