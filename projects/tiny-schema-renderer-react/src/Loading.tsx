import './Loading.css';

export function Loading() {
  return (
    <div className="loading-warp" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
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
