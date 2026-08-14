import { Type } from '@angular/core';
import { CardComponent, CardHeaderComponent, CardModule } from 'ng-devui/card';
import {
  DataTableColumnTmplComponent,
  DataTableComponent,
  DataTableModule,
} from 'ng-devui/data-table';
import { DatepickerProComponent, DatepickerProModule } from 'ng-devui/datepicker-pro';
import {
  DBarChartComponent,
  DLineChartComponent,
  DPieChartComponent,
} from './charts/charts';

export const components: Record<string, Type<any>> = {
  DCard: CardComponent,
  DCardHeader: CardHeaderComponent,
  DDatePicker: DatepickerProComponent,
  DDataTable: DataTableComponent,
  DColumn: DataTableColumnTmplComponent,
  DLineChart: DLineChartComponent,
  DBarChart: DBarChartComponent,
  DPieChart: DPieChartComponent,
};

export const modules: Record<string, Type<any>> = {
  DCard: CardModule,
  DCardHeader: CardModule,
  DDatePicker: DatepickerProModule,
  DDataTable: DataTableModule,
  DColumn: DataTableModule,
};
