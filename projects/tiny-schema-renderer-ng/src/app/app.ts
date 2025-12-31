import { Component, signal } from '@angular/core';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { FormsModule } from '@angular/forms';
import { TiTextModule } from '@opentiny/ng';
import { TiSelectModule } from '@opentiny/ng';
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [RendererMain, FormsModule, TiTextModule, TiSelectModule],
})
export class App {
  schema = signal<any>({});
  inputValue = ''
  selectValue = ''
  options = [
    { label: '中国', value: 'china' },
    { label: '美国', value: 'usa' },
    { label: '英国', value: 'uk' },
  ]

  async ngOnInit() {
    this.schema.set(await import('../mock/schema.json').then(m => m.default));
    console.log('schema', this.schema());
  }
  log(...args: any[]) {
    console.log('app log', ...args);
  }
}
