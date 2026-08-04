import { createContext, useContext } from "react";

/**
 * Vrai lorsque le contenu est rendu à l'intérieur de la coquille authentifiée
 * (AppLayout : sidebar desktop, top bar mobile, BottomNav).
 * Permet à PublicHeader de ne jamais empiler un second en tête.
 */
const AppShellContext = createContext(false);

export const AppShellProvider = AppShellContext.Provider;

export const useInAppShell = () => useContext(AppShellContext);
