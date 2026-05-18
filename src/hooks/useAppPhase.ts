import { useCallback, useEffect, useRef, useState } from 'react';

export type AppPhase = 'landing' | 'exploring';

export interface AppPhaseApi {
    phase: AppPhase;
    heroVisible: boolean;
    panelVisible: boolean;
    showInfoModal: boolean;
    setShowInfoModal: (open: boolean) => void;
    enterExploring: () => void;
    backToLanding: () => void;
}

// Owns the app's "phase" state (landing vs exploring) and the visibility flags
// for the hero overlay + floating input panel that fade in/out around phase
// transitions. Timeouts are tracked in a ref and cleared on unmount so a quick
// nav-away during a transition doesn't trigger "setState on unmounted" warnings.
export default function useAppPhase(): AppPhaseApi {
    const [phase, setPhase] = useState<AppPhase>('landing');
    const [heroVisible, setHeroVisible] = useState(true);
    const [panelVisible, setPanelVisible] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
        const id = setTimeout(() => {
            timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
            fn();
        }, ms);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    useEffect(() => () => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    }, []);

    const enterExploring = useCallback(() => {
        setPhase('exploring');
        setHeroVisible(false);
        scheduleTimeout(() => setPanelVisible(true), 400);
    }, [scheduleTimeout]);

    const backToLanding = useCallback(() => {
        setPanelVisible(false);
        setPhase('landing');
        scheduleTimeout(() => setHeroVisible(true), 600);
    }, [scheduleTimeout]);

    return {
        phase,
        heroVisible,
        panelVisible,
        showInfoModal,
        setShowInfoModal,
        enterExploring,
        backToLanding,
    };
}
