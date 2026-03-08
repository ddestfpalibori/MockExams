import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook personnalisé pour gérer l'historique de navigation (LIFO)
 * Pattern React recommandé : update state pendant le rendu (pas dans useEffect)
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useNavigationHistory() {
    const location = useLocation();
    const navigate = useNavigate();
    const [history, setHistory] = useState<string[]>([location.pathname]);
    const [prevPathname, setPrevPathname] = useState(location.pathname);

    // Mettre à jour l'historique pendant le rendu quand la pathname change
    if (prevPathname !== location.pathname) {
        setPrevPathname(location.pathname);
        setHistory((prev) => [...prev, location.pathname]);
    }

    const goBack = useCallback(() => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop(); // Page actuelle
            const previousPage = newHistory[newHistory.length - 1];

            if (previousPage) {
                setHistory(newHistory);
                navigate(previousPage);
            } else {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    }, [history, navigate]);

    const dashboardRoots = ['/', '/admin', '/centre', '/etablissement', '/tutelle'];
    const canGoBack = history.length > 1 && !dashboardRoots.includes(location.pathname);

    return { goBack, canGoBack, history };
}
