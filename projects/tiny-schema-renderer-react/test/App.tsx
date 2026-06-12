import { useState } from 'react';
import { PageContextProvider, SchemaRenderer } from '../src';
import { demos } from './mock';
import { testMaterials } from './materials';

/**
 * 测试应用根组件，提供示例切换与 Schema 渲染。
 * 物料通过 PageContextProvider.settings 外部注入，渲染器核心不依赖具体 UI 库。
 */
export function App() {
  const [activeId, setActiveId] = useState(demos[0].id);
  const current = demos.find((d) => d.id === activeId) ?? demos[0];

  return (
    <>
      <header className="app-header">
        <h1>tiny-schema-renderer-react 本地验证</h1>
        <nav className="demo-tabs">
          {demos.map((demo) => (
            <button
              key={demo.id}
              type="button"
              className={`demo-tab${activeId === demo.id ? ' active' : ''}`}
              onClick={() => setActiveId(demo.id)}
            >
              {demo.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-content">
        <PageContextProvider settings={testMaterials}>
          <SchemaRenderer schema={current.schema} />
        </PageContextProvider>
      </main>
    </>
  );
}
