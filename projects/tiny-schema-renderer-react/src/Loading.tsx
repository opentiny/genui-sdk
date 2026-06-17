import './Loading.css';

/**
 * Schema 尚未就绪时的加载占位，对齐 Vue tiny-schema-renderer Loading.vue。
 */
export function Loading() {
  return (
    <div className="loading-warp">
      <div className="loading">
        <div>
          <span />
        </div>
        <div>
          <span />
        </div>
        <div>
          <span />
        </div>
      </div>
    </div>
  );
}
