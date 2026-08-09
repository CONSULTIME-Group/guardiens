import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Permet à un écran plein cadre (fil de messagerie mobile, par exemple) de
 * demander le masquage de la barre de navigation basse et de son bouton
 * flottant, afin qu'ils ne recouvrent jamais une zone de saisie.
 */
interface ChromeVisibilityValue {
  bottomNavHidden: boolean;
  requestHideBottomNav: () => () => void;
  topBarHidden: boolean;
  requestHideTopBar: () => () => void;
}

const ChromeVisibilityContext = createContext<ChromeVisibilityValue>({
  bottomNavHidden: false,
  requestHideBottomNav: () => () => {},
  topBarHidden: false,
  requestHideTopBar: () => () => {},
});

export const ChromeVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [count, setCount] = useState(0);
  const [topCount, setTopCount] = useState(0);

  const requestHideBottomNav = useCallback(() => {
    setCount((c) => c + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCount((c) => Math.max(0, c - 1));
    };
  }, []);

  const requestHideTopBar = useCallback(() => {
    setTopCount((c) => c + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setTopCount((c) => Math.max(0, c - 1));
    };
  }, []);

  const value = useMemo(
    () => ({
      bottomNavHidden: count > 0,
      requestHideBottomNav,
      topBarHidden: topCount > 0,
      requestHideTopBar,
    }),
    [count, requestHideBottomNav, topCount, requestHideTopBar],
  );

  return <ChromeVisibilityContext.Provider value={value}>{children}</ChromeVisibilityContext.Provider>;
};

export const useChromeVisibility = () => useContext(ChromeVisibilityContext);

/** Masque la barre basse tant que `active` est vrai. */
export const useHideBottomNav = (active: boolean) => {
  const { requestHideBottomNav } = useChromeVisibility();
  useEffect(() => {
    if (!active) return;
    const release = requestHideBottomNav();
    return release;
  }, [active, requestHideBottomNav]);
};

/**
 * Masque la barre supérieure applicative tant que `active` est vrai.
 * Sert aux écrans qui portent déjà leur propre en tête avec un retour, afin
 * de ne jamais afficher deux flèches retour sur le même écran.
 */
export const useHideTopBar = (active: boolean) => {
  const { requestHideTopBar } = useChromeVisibility();
  useEffect(() => {
    if (!active) return;
    const release = requestHideTopBar();
    return release;
  }, [active, requestHideTopBar]);
};
