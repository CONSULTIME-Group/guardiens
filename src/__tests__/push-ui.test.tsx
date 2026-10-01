import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PushNotificationsSection from '@/components/settings/PushNotificationsSection';
const mocks = vi.hoisted(() => ({ support: 'supported', config: vi.fn(), state: vi.fn(), enable: vi.fn(), disable: vi.fn(), update: vi.fn(), test: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-user' } }) }));
vi.mock('@/lib/web-push', () => ({ pushSupport: () => mocks.support, getPushConfig: mocks.config, getPushState: mocks.state, enablePush: mocks.enable, disablePush: mocks.disable, updatePushPreferences: mocks.update, testPushOnDevice: mocks.test }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.support='supported';
  mocks.config.mockResolvedValue({enabled:true,publicKey:'public-fixture'});
  mocks.state.mockResolvedValue({subscribed:false,messages:true,applications:true});
  mocks.enable.mockResolvedValue({nearbyRequested:false,nearbySaved:false}); mocks.disable.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined);
  vi.stubGlobal('Notification',{permission:'default'});
});
const show=()=>render(<MemoryRouter><PushNotificationsSection /></MemoryRouter>);
afterEach(() => vi.useRealTimers());
describe('Push settings',()=>{
  it.each(['config', 'state'] as const)('exits loading when %s never settles and allows a successful retry', async (source) => {
    vi.useFakeTimers();
    mocks[source].mockImplementationOnce(() => new Promise(() => {}));
    show();
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(screen.queryByText('Vérification des notifications…')).toBeNull();
    expect(screen.getByText(/momentanément indisponible/)).toBeInTheDocument();
    expect(mocks.enable).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Réessayer' })); });
    expect(screen.getByRole('button', { name: 'Activer sur cet appareil' })).toBeEnabled();
    expect(mocks.enable).not.toHaveBeenCalled();
  });
  it('ignores an old response that arrives after timeout and a successful retry', async () => {
    vi.useFakeTimers();
    let resolveOld!: (value: unknown) => void;
    mocks.state.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    show();
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Réessayer' })); });
    await act(async () => { resolveOld({ subscribed: true, messages: false, applications: false }); });
    expect(screen.getByRole('button', { name: 'Activer sur cet appareil' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Désactiver sur cet appareil' })).toBeNull();
  });
  it('offers retry on config failure while preserving device disable', async () => {
    mocks.config.mockRejectedValueOnce(new Error('offline'));
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true});
    show();
    expect(await screen.findByRole('button',{name:'Réessayer'})).toBeEnabled();
    expect(screen.getByRole('button',{name:'Désactiver sur cet appareil'})).toBeEnabled();
  });
  it('never prompts automatically and enables only on click',async()=>{
    show(); const button=await screen.findByRole('button',{name:'Activer sur cet appareil'});
    expect(mocks.enable).not.toHaveBeenCalled();
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true,nearbySits:false,nearbyAvailable:true});
    fireEvent.click(button);
    expect(await screen.findByText('Notifications activées sur cet appareil. Vous pouvez maintenant les tester.')).toBeInTheDocument();
    expect(mocks.enable).toHaveBeenCalledWith('fixture-user',{enabled:true,publicKey:'public-fixture'},{messages:true,applications:true,nearbySits:false});
    // État relu après activation : le réglage annonces proches apparaît sans recharger.
    expect(screen.getByRole('switch',{name:/Nouvelles annonces près de chez moi/})).toHaveAttribute('aria-checked','false');
    expect(screen.getByRole('button',{name:'Tester sur cet appareil'})).toBeInTheDocument();
  });
  it('configuration absent does not offer permission',async()=>{
    mocks.config.mockResolvedValue({enabled:false});show();
    expect(await screen.findByText(/arrivent bientôt/)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Activer sur cet appareil'})).toBeNull();
  });
  it('shows home-screen instructions on iOS before installation',()=>{
    mocks.support='ios-install';show();expect(screen.getByRole('link',{name:/étapes d’installation/})).toHaveAttribute('href','/settings?section=installation');expect(mocks.config).not.toHaveBeenCalled();
  });
  it('does not re-prompt a denied permission',async()=>{
    vi.stubGlobal('Notification',{permission:'denied'});show();expect(await screen.findByRole('button',{name:'Activer sur cet appareil'})).toBeDisabled();
  });
  it('disables the current device',async()=>{
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:false});show();fireEvent.click(await screen.findByRole('button',{name:'Désactiver sur cet appareil'}));
    expect(await screen.findByText('Notifications désactivées sur cet appareil.')).toBeInTheDocument();expect(mocks.disable).toHaveBeenCalledWith('fixture-user');
  });
  it('failed preference write retains the old choice',async()=>{
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:false});mocks.update.mockRejectedValue(new Error());show();
    const control=await screen.findByRole('switch',{name:'Nouveaux messages'});fireEvent.click(control);
    await screen.findByText(/préférences restent à enregistrer/);expect(control).toHaveAttribute('aria-checked','true');
  });
  it('keeps device disable available if configuration fetch fails',async()=>{
    mocks.config.mockRejectedValue(new Error());mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true});show();expect(await screen.findByRole('button',{name:'Désactiver sur cet appareil'})).toBeEnabled();
  });

  it('partial activation: nearby not saved is said plainly, switch shows the real (off) value',async()=>{
    mocks.enable.mockResolvedValue({nearbyRequested:true,nearbySaved:false});show();
    fireEvent.click(await screen.findByRole('switch',{name:/Nouvelles annonces/}));
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true,nearbySits:false,nearbyAvailable:true});
    fireEvent.click(screen.getByRole('button',{name:'Activer sur cet appareil'}));
    expect(await screen.findByText(/n’ont pas pu être enregistrées/)).toBeInTheDocument();
    expect(screen.queryByText('Notifications activées sur cet appareil. Vous pouvez maintenant les tester.')).toBeNull();
    expect(screen.getByRole('switch',{name:/Nouvelles annonces/})).toHaveAttribute('aria-checked','false');
  });
  it('failed preference write reloads the confirmed server values',async()=>{
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true,nearbySits:false,nearbyAvailable:true});
    mocks.update.mockRejectedValue(new Error('push_not_updated'));show();
    const nearby=await screen.findByRole('switch',{name:/Nouvelles annonces/});fireEvent.click(nearby);
    await screen.findByText(/préférences restent à enregistrer/);
    expect(mocks.state).toHaveBeenCalledTimes(2);expect(nearby).toHaveAttribute('aria-checked','false');
  });
  it('outdated worker on preference: explicit message, nothing claimed',async()=>{
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true,nearbySits:false,nearbyAvailable:true});
    mocks.update.mockRejectedValue(new Error('push_worker_outdated'));show();
    fireEvent.click(await screen.findByRole('switch',{name:/Nouvelles annonces/}));
    expect(await screen.findByText(/mise à jour des notifications de votre navigateur/)).toBeInTheDocument();
  });
  it('uncertain server state hides settings and never claims active',async()=>{
    mocks.state.mockResolvedValue({subscribed:false,uncertain:true,messages:true,applications:true});show();
    expect(await screen.findByText(/n’a pas pu être confirmé/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();expect(screen.queryByRole('button',{name:'Tester sur cet appareil'})).toBeNull();
  });
  it.each([
    ['uncertain',/un envoi a pu avoir lieu/],
    ['rate_limited',/déjà été demandé/],
    ['unavailable',/plus actif .* Aucun test n’a été envoyé/],
    ['worker_outdated',/Aucun test n’a été envoyé/],
    ['accepted',/transmise au service de votre appareil/],
  ])('test result %s: honest message, single call',async(result,text)=>{
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true,nearbySits:false,nearbyAvailable:true});mocks.test.mockResolvedValue(result);show();
    fireEvent.click(await screen.findByRole('button',{name:'Tester sur cet appareil'}));
    expect(await screen.findByText(text)).toBeInTheDocument();expect(mocks.test).toHaveBeenCalledOnce();
    if(result==='rate_limited')expect(screen.queryByText(/envoyé/)).toBeNull();
  });
  it('stale test result (account changed) is ignored',async()=>{
    mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true});mocks.test.mockResolvedValue('stale');show();
    fireEvent.click(await screen.findByRole('button',{name:'Tester sur cet appareil'}));
    await screen.findByRole('button',{name:'Tester sur cet appareil'});
    await new Promise((r)=>setTimeout(r,20));
    expect(screen.queryByText(/test|envoi/i,{selector:'p[role=status]'})).toBeNull();
  });
});
