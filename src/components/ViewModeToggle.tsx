import { useT } from '../i18n/index';

export type ViewMode = '2d' | '3d';

interface ViewModeToggleProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
    // When WebGL is unavailable the 3D option is locked out and the control
    // stays pinned to 2D.
    disabled?: boolean;
}

// Small 2D/3D switch. The reviewer asked for a traditional 2D view "as an
// option" — this is that option, always available when WebGL works.
export default function ViewModeToggle({ mode, onChange, disabled }: ViewModeToggleProps) {
    const t = useT();
    return (
        <div className="view-mode-toggle" role="group" title={String(t('view.toggle_title'))}>
            <button
                type="button"
                className={`view-mode-pill ${mode === '3d' ? 'view-mode-pill-active' : ''}`}
                onClick={() => onChange('3d')}
                disabled={disabled}
                aria-pressed={mode === '3d'}
            >
                {String(t('view.mode_3d'))}
            </button>
            <button
                type="button"
                className={`view-mode-pill ${mode === '2d' ? 'view-mode-pill-active' : ''}`}
                onClick={() => onChange('2d')}
                aria-pressed={mode === '2d'}
            >
                {String(t('view.mode_2d'))}
            </button>
        </div>
    );
}
