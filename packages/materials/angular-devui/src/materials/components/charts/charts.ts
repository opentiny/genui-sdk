import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

@Component({
  selector: 'd-chart-host',
  standalone: true,
  template: `<div #host [style.width]="'100%'" [style.height]="height"></div>`,
})
export class DChartHostComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() options: EChartsOption | Record<string, any>;
  @Input() height = '320px';

  @ViewChild('host', { static: true }) host: ElementRef<HTMLDivElement>;

  private chart: ECharts;

  ngAfterViewInit() {
    this.chart = echarts.init(this.host.nativeElement);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.options && this.chart) {
      this.render();
    }
  }

  ngOnDestroy() {
    this.chart?.dispose();
  }

  private render() {
    if (!this.chart || !this.options) {
      return;
    }
    this.chart.setOption(this.options, true);
  }
}

@Component({
  selector: 'd-line-chart',
  standalone: true,
  imports: [DChartHostComponent],
  template: `<d-chart-host [options]="options" [height]="height"></d-chart-host>`,
})
export class DLineChartComponent {
  @Input() options: EChartsOption | Record<string, any>;
  @Input() height = '320px';
}

@Component({
  selector: 'd-bar-chart',
  standalone: true,
  imports: [DChartHostComponent],
  template: `<d-chart-host [options]="options" [height]="height"></d-chart-host>`,
})
export class DBarChartComponent {
  @Input() options: EChartsOption | Record<string, any>;
  @Input() height = '320px';
}

@Component({
  selector: 'd-pie-chart',
  standalone: true,
  imports: [DChartHostComponent],
  template: `<d-chart-host [options]="options" [height]="height"></d-chart-host>`,
})
export class DPieChartComponent {
  @Input() options: EChartsOption | Record<string, any>;
  @Input() height = '320px';
}
