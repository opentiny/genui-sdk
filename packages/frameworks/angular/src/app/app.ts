import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * 应用壳,只挂路由出口。两个页面:
 *   /         chat 演示(原 App 的内容,已搬到 src/app/chat)
 *   /preview  出码实时预览(见 src/app/preview)
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
