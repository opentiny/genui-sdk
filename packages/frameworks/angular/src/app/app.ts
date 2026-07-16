import { Component } from '@angular/core';
import { fetchSchemaStream } from '../fetch-schema-stream';
import { FormsModule } from '@angular/forms';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  selector: 'app-root',
  imports: [FormsModule, GenuiConfigProvider, GenuiRenderer],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class App {
  inputText = '';
  schema = '';
  rendererKey = '';
  generating = false;
  protected readonly activeMaterials = materials;
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
