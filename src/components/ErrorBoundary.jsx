import { Component } from 'react';

// Catches any render-time crash and shows a readable message instead of a
// blank white page. Added after a temporal-dead-zone bug in
// PortfolioContext took the whole dashboard down with nothing on screen but
// a minified console error — the failure was trivial to fix, but invisible.
//
// Deliberately plain inline styles, not the wd-* classes: if the crash came
// from the theme/CSS layer itself, this still has to render.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Welldee crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#1b1230',
          color: '#f3eeff',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Welldee hit an error
          </h1>
          <p style={{ color: '#c7bedd', marginBottom: '1rem', lineHeight: 1.6 }}>
            Your data is safe — it's stored locally and on the server, and nothing here was
            deleted. This screen just means the app couldn't render.
          </p>
          <pre
            style={{
              backgroundColor: '#2a2245',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              overflowX: 'auto',
              color: '#fb92a9',
              marginBottom: '1rem',
            }}
          >
            {this.state.error?.message ?? String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#8e72e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 20px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
