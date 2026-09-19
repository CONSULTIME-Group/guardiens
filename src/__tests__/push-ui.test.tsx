import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PushNotificationsSection from '@/components/settings/PushNotificationsSection';
const mocks = vi.hoisted(() => ({ support: 'supported', config: vi.fn(), state: vi.fn(), enable: vi.fn(), disable: vi.fn(), update: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-user' } }) }));
vi.mock('@/lib/web-push', () => ({ pushSupport: () => mocks.support, getPushConfig: mocks.config, getPushState: mocks.state, enablePush: mocks.enable, disablePush: mocks.disable, updatePushPreferences: mocks.update }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.support='supported';
  mocks.config.mockResolvedValue({enabled:true,publicKey:'public-fixture'});
  mocks.state.mockResolvedValue({subscribed:false,messages:true,applications:true});
  mocks.enable.mockResolvedValue(undefined); mocks.disable.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined);
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
    expect(mocks.enable).not.toHaveBeenCalled();fireEvent.click(button);
    expect(await screen.findByText('Notifications activées sur cet appareil.')).toBeInTheDocument();
    expect(mocks.enable).toHaveBeenCalledWith('fixture-user',{enabled:true,publicKey:'public-fixture'},{messages:true,applications:true});
  });
  it('configuration absent does not offer permission',async()=>{
    mocks.config.mockResolvedValue({enabled:false});show();
    expect(await screen.findByText(/ne sont pas encore disponibles/)).toBeInTheDocument();
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
    await screen.findByText(/Préférences non enregistrées/);expect(control).toHaveAttribute('aria-checked','true');
  });
  it('keeps device disable available if configuration fetch fails',async()=>{
    mocks.config.mockRejectedValue(new Error());mocks.state.mockResolvedValue({subscribed:true,messages:true,applications:true});show();expect(await screen.findByRole('button',{name:'Désactiver sur cet appareil'})).toBeEnabled();
  });
});
