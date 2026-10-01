import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({
  state: { standalone: false, knownInstalled: false, canPrompt: false },
  platform: { ios: false, mobile: true, embedded: false },
  first: false, local: false, support: 'supported', request: vi.fn(), track: vi.fn(), nav: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/usePwaInstall', () => ({ usePwaInstall: () => m.state }));
vi.mock('@/lib/pwa-install', () => ({ installPlatform: () => m.platform, requestInstall: m.request, firstInstallVisitDue: () => m.first }));
vi.mock('@/lib/web-push', () => ({ hasLocalPushSubscription: () => m.local, pushSupport: () => m.support }));
vi.mock('@/lib/analytics', () => ({ trackEvent: m.track }));
vi.mock('react-router-dom', async (o) => ({ ...(await o<typeof import('react-router-dom')>()), useNavigate: () => m.nav }));
import InstallAppCard, { cardDue } from '@/components/dashboard/shared/InstallAppCard';

const view = () => render(<MemoryRouter><InstallAppCard /></MemoryRouter>);
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  Object.assign(m.state, { standalone: false, knownInstalled: false, canPrompt: false });
  Object.assign(m.platform, { ios: false, mobile: true, embedded: false });
  m.first = false; m.local = false;
  (globalThis as any).Notification = { permission: 'default', requestPermission: vi.fn() };
});

describe('Carte installation du tableau de bord', () => {
  it('Android avec fenêtre disponible : déclenche la vraie demande du navigateur', async () => {
    m.state.canPrompt = true; m.request.mockResolvedValue('accepted'); view();
    fireEvent.click(screen.getByRole('button', { name: "Installer l'app" }));
    expect(m.request).toHaveBeenCalledOnce();
    expect(m.track).toHaveBeenCalledWith('pwa_install_cta_shown', expect.anything());
  });
  it('sans fenêtre : guide réaliste, aucune promesse en un clic', () => {
    view(); fireEvent.click(screen.getByRole('button', { name: 'Voir comment installer' }));
    expect(m.request).not.toHaveBeenCalled(); expect(m.nav).toHaveBeenCalledWith('/settings?section=installation');
  });
  it('« Plus tard » masque, rappel plafonné à 3 fois sur 14 jours', () => {
    view(); fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByText("Installer l'app Guardiens")).toBeNull();
    expect(cardDue('guardiens_install_card:u1')).toBe(false);
    localStorage.setItem('guardiens_install_card:u1', JSON.stringify({ last: 0, count: 3 }));
    expect(cardDue('guardiens_install_card:u1')).toBe(false);
  });
  it('première visite : laissée au bandeau d’accueil, pas de doublon', () => { m.first = true; view(); expect(screen.queryByRole('heading')).toBeNull(); });
  it('app installée : propose d’activer les notifications, sans demander la permission', () => {
    m.state.standalone = true; view();
    fireEvent.click(screen.getByRole('button', { name: 'Choisir mes notifications' }));
    expect(m.nav).toHaveBeenCalledWith('/settings?section=notifications');
    expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
  });
  it('app installée et notifications déjà actives ou refusées : rien', () => {
    m.state.standalone = true; m.local = true; const a = view(); expect(screen.queryByRole('heading')).toBeNull(); a.unmount();
    m.local = false; (globalThis as any).Notification.permission = 'denied'; view(); expect(screen.queryByRole('heading')).toBeNull();
  });
  it('ordinateur ou navigateur intégré : rien', () => {
    m.platform.mobile = false; const a = view(); expect(screen.queryByRole('heading')).toBeNull(); a.unmount();
    m.platform.mobile = true; m.platform.embedded = true; view(); expect(screen.queryByRole('heading')).toBeNull();
  });
});
