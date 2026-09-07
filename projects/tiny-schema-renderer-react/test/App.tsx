import { useState } from 'react';
import { RendererContextProvider, SchemaRenderer } from '../src';
import { demos } from './mock';
import { components } from './components';

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
        <RendererContextProvider render-settings={{ materials: { components } }}>
          <SchemaRenderer schema={current.schema} />
        </RendererContextProvider>
      </main>
    </>
  );
}
