import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({
  state: { standalone: false, knownInstalled: false, canPrompt: false },
  platform: { ios: false, mobile: true, embedded: false },
  first: false, local: false, due: true, nearby: false, support: 'supported', request: vi.fn(), track: vi.fn(), nav: vi.fn(), mark: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/usePwaInstall', () => ({ usePwaInstall: () => m.state }));
vi.mock('@/lib/pwa-install', () => ({ installPlatform: () => m.platform, requestInstall: m.request, firstInstallVisitDue: () => m.first, reminderDue: () => m.due, markInstallSuggestion: m.mark }));
vi.mock('@/lib/web-push', () => ({ hasLocalPushSubscription: () => m.local, pushSupport: () => m.support, nearbySettingToDiscover: () => m.nearby }));
vi.mock('@/lib/analytics', () => ({ trackEvent: m.track }));
vi.mock('react-router-dom', async (o) => ({ ...(await o<typeof import('react-router-dom')>()), useNavigate: () => m.nav }));
import InstallAppCard, { cardDue } from '@/components/dashboard/shared/InstallAppCard';

const view = () => render(<MemoryRouter><InstallAppCard /></MemoryRouter>);
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  Object.assign(m.state, { standalone: false, knownInstalled: false, canPrompt: false });
  Object.assign(m.platform, { ios: false, mobile: true, embedded: false });
  m.first = false; m.local = false; m.due = true; m.nearby = false;
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
  it('installation : exposition comptée dans le rappel partagé avec l’accueil et Alma, « Plus tard » masque', () => {
    view(); expect(m.mark).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByText("Installer l'app Guardiens")).toBeNull();
  });
  it('rappel partagé épuisé ou trop récent : pas de carte installation', () => { m.due = false; view(); expect(screen.queryByRole('heading')).toBeNull(); expect(m.mark).not.toHaveBeenCalled(); });
  it('bénéfice notifications : activation séparée annoncée', () => { view(); expect(screen.getByText(/activez ensuite les notifications \(étape séparée\)/)).toBeInTheDocument(); });
  it('étapes suivantes : « Plus tard » plafonné à 3 fois sur 14 jours', () => {
    m.state.standalone = true; view(); fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(cardDue('guardiens_notifications_card:u1')).toBe(false);
    localStorage.setItem('guardiens_notifications_card:u1', JSON.stringify({ last: 0, count: 3 }));
    expect(cardDue('guardiens_notifications_card:u1')).toBe(false);
    localStorage.setItem('guardiens_notifications_card:u1', JSON.stringify({ last: 0, count: 1 }));
    expect(cardDue('guardiens_notifications_card:u1')).toBe(true);
  });
  it('installation confirmée pendant la visite d’accueil : l’étape notifications apparaît', () => {
    m.first = true; const a = view(); expect(screen.queryByRole('heading')).toBeNull();
    m.state.knownInstalled = true; a.rerender(<MemoryRouter><InstallAppCard /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Activer les notifications' })).toBeInTheDocument();
  });
  it('notifications déjà actives (cas Jérémie) : le réglage annonces proches reste découvrable', () => {
    m.state.standalone = true; m.local = true; m.nearby = true; view();
    expect(screen.getByRole('heading', { name: 'Nouvelles annonces près de chez vous' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le réglage' }));
    expect(m.nav).toHaveBeenCalledWith('/settings?section=notifications');
    expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
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
