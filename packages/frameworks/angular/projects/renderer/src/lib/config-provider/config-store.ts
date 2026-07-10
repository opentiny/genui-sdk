import { Injectable, signal } from '@angular/core';
import type { IRendererMaterials } from '@opentiny/tiny-schema-renderer-ng';

/**
 * 在 ConfigProvider 作用域内保存物料配置，供子组件通过 DI 读取。
 */
@Injectable()
export class GenuiConfigStore {
  readonly materials = signal<IRendererMaterials>({});

  /**
   * 同步 ConfigProvider 传入的物料配置。
   *
   * @param materials - 应用层组装的物料
   */
  setMaterials(materials?: IRendererMaterials): void {
    this.materials.set(materials ?? {});
  }
}
