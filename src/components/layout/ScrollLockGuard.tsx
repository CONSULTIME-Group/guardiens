import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Filet de sécurité contre les verrous de défilement orphelins.
 *
 * Radix pose `data-scroll-locked` et `overflow: hidden` sur le body à
 * l'ouverture d'une couche (dialogue, menu, popover) et ne les retire qu'à
 * la fermeture. Une couche démontée alors qu'elle est encore ouverte laisse
 * donc le body verrouillé jusqu'au rechargement de la page.
 *
 * À chaque changement de chemin, on vérifie qu'aucune couche n'est ouverte,
 * et si c'est bien le cas on libère le body. Cela rend le symptôme
 * impossible, y compris pour les couches non identifiées.
 */
const OPEN_LAYER_SELECTOR = [
  '[data-state="open"][role="dialog"]',
  '[role="alertdialog"]',
  "[data-radix-popper-content-wrapper]",
].join(",");

export const releaseScrollLockIfIdle = () => {
  if (typeof document === "undefined") return false;
  if (document.querySelector(OPEN_LAYER_SELECTOR)) return false;
  const body = document.body;
  if (!body) return false;
  body.removeAttribute("data-scroll-locked");
  body.style.removeProperty("pointer-events");
  body.style.removeProperty("overflow");
  return true;
};

const ScrollLockGuard = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    releaseScrollLockIfIdle();
  }, [pathname]);

  return null;
};

export default ScrollLockGuard;
