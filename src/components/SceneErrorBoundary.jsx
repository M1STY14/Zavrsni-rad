import { Component } from 'react';

export default class SceneErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Scene crashed:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
        color: '#eee',
        background: '#0a0a0a',
      }}>
        <h2 style={{ margin: 0 }}>3D scene crashed</h2>
        <p style={{ opacity: 0.7, maxWidth: '32rem' }}>
          Your GPU or browser may not support WebGL features this visualization needs.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '0.4rem',
            border: '1px solid #444',
            background: '#1a1a1a',
            color: '#eee',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
