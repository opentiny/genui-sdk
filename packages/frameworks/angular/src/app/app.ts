import { Component } from '@angular/core';
import { fetchSchemaStream } from '../fetch-schema-stream';
import { FormsModule } from '@angular/forms';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-ng-devui/materials';
import '@opentiny/genui-sdk-materials-angular-ng-devui/patch';
import formJson from './form.json';
import table1Json from './table.json';
import table2Json from './table2.json';
import table3Json from './table3.json';
import table31Json from './table3.1.json';

@Component({
  selector: 'app-root',
  imports: [FormsModule, GenuiConfigProvider, GenuiRenderer],
  templateUrl: './app.html',
  styleUrls: ['./app.less'],
})
export class App {
  inputText = '';
  schema: any = JSON.stringify(formJson);
  table1Schema: any = JSON.stringify(table1Json);
  table2Schema: any = JSON.stringify(table2Json);
  table3Schema: any = JSON.stringify(table3Json);
  table31Schema: any = JSON.stringify(table31Json);

  rendererKey = '';
  generating = false;
  protected readonly activeMaterials = materials;

  ngOnInit() {
    // import('./form.json').then(res => {
    //   this.schema = res.default;
    // });
  }
  async handleSend() {
    if (!this.inputText.trim() || this.generating) return;

    this.generating = true;
    this.schema = '';
    this.rendererKey = this.rendererKey + 1;
    const userInput = this.inputText;
    this.inputText = '';

    try {
      await fetchSchemaStream('http://localhost:3100/chat/completions', userInput, (schemaChunk: string) => {
        this.schema += schemaChunk;
      });
    } catch (error) {
      console.error('请求失败:', error);
    } finally {
      this.generating = false;
    }
  }
  handlePrint(schema: any) {
    console.log(schema);
  }
}
