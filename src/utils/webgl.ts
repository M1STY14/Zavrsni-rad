// Probes whether the browser can give us a WebGL rendering context. The 3D
// scene (Three.js / @react-three/fiber) is useless without one — when this
// returns false, AppShell falls back to the 2D SVG view and shows a banner.
//
// Creating a throwaway canvas and asking for a context is the standard, cheap
// way to detect support without depending on Three.js internals. Wrapped in a
// try/catch because some browsers throw (rather than return null) when WebGL is
// disabled by policy or a blocklisted driver.
export function isWebGLAvailable(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        const gl =
            canvas.getContext('webgl2') ||
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl');
        return gl != null;
    } catch {
        return false;
    }
}
