import { Moon, Sun } from 'lucide-react';
import { useT } from '../i18n/index';
import { useTheme } from '../theme';

export default function ThemeToggle({ phase }: { phase?: string }) {
    const t = useT();
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === 'light';

    return (
        <button
            type="button"
            className={`theme-toggle ${phase === 'landing' ? 'theme-toggle-landing' : ''}`}
            onClick={toggleTheme}
            title={String(t('theme.toggle_title'))}
            aria-label={String(t('theme.toggle_title'))}
            aria-pressed={isLight}
        >
            {isLight ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
        </button>
    );
}
