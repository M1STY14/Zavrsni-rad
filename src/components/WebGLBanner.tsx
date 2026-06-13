import { useT } from '../i18n/index';

interface WebGLBannerProps {
    visible: boolean;
}

// Shown when the browser can't give us a WebGL context. Explains why the user
// is seeing the simplified 2D view instead of the 3D scene — the exact
// situation a reviewer hit when their browser had hardware acceleration off.
export default function WebGLBanner({ visible }: WebGLBannerProps) {
    const t = useT();
    if (!visible) return null;
    return <div className="webgl-banner">{String(t('view.webgl_unavailable'))}</div>;
}
