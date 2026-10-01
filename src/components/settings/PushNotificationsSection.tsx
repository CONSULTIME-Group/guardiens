import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { trackEvent } from '@/lib/analytics';
import {
  disablePush, enablePush, testPushOnDevice, getPushConfig, getPushState, pushSupport, updatePushPreferences,
  type PushConfig, type PushPreferences,
} from '@/lib/web-push';

export default function PushNotificationsSection() {
  const { user } = useAuth();
  const [config, setConfig] = useState<PushConfig>({ enabled: false });
  const [prefs, setPrefs] = useState<PushPreferences>({ messages: true, applications: true, nearbySits: false });
  const [nearbyAvailable, setNearbyAvailable] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const support = pushSupport();
  const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  useEffect(() => {
    let current = true;
    setConfig({ enabled: false }); setSubscribed(false); setMessage(''); setLoading(true); setCanRetry(false); setUncertain(false);
    if (!user || support !== 'supported') { setLoading(false); return; }
    let configFailed = false;
    let timer: ReturnType<typeof setTimeout>;
    // Bound the entire read, including session and browser calls. A late
    // response cannot replace the result of a retry or another account.
    const read = Promise.all([getPushConfig(user.id).catch(() => {
      configFailed = true;
      return { enabled: false };
    }), getPushState(user.id)]);
    Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('push_load_timeout')), 12000);
    })]).then(([settings, state]) => {
      if (!current) return;
      setConfig(settings); setSubscribed(state.subscribed);
      setPrefs({ messages: state.messages, applications: state.applications, nearbySits: state.nearbySits === true });
      setNearbyAvailable(state.nearbyAvailable === true);
      if (state.uncertain) {
        setUncertain(true);
        setMessage('L’état des notifications sur cet appareil n’a pas pu être confirmé. Réessayez dans un instant.');
        setCanRetry(true);
      }
      if (configFailed) {
        setMessage('Le service de notifications est momentanément indisponible. Vos emails restent inchangés.');
        setCanRetry(true);
      }
    }).catch(() => { if (current) {
      setMessage('Le service de notifications est momentanément indisponible. Vos emails restent inchangés.');
      setCanRetry(true);
    } })
      .finally(() => { clearTimeout(timer); if (current) setLoading(false); });
    return () => { current = false; clearTimeout(timer); };
  }, [user?.id, support, attempt]);

  async function toggle() {
    if (!user || busy) return;
    setBusy(true); setMessage('');
    try {
      if (subscribed) { await disablePush(user.id); setSubscribed(false); setMessage('Notifications désactivées sur cet appareil.'); void trackEvent('push_disabled', { source: 'settings' }); }
      else { await enablePush(user.id, config, prefs); setSubscribed(true); setMessage('Notifications activées sur cet appareil. Vous pouvez maintenant les tester.');
        void trackEvent('push_enabled', { source: 'settings', metadata: { messages: prefs.messages, applications: prefs.applications, nearby_sits: prefs.nearbySits === true } }); }
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'push_permission_denied'
        ? 'Autorisez Guardiens dans les réglages de votre navigateur pour recevoir les notifications.'
        : 'La modification reste à confirmer. Réessayez dans un instant. Vos emails restent inchangés.');
    } finally { setBusy(false); }
  }

  async function save(next: PushPreferences) {
    if (!user || busy) return;
    if (!subscribed) { setPrefs(next); return; }
    setBusy(true); setMessage('');
    try { await updatePushPreferences(user.id, next); setPrefs(next); setMessage('Préférences enregistrées pour cet appareil.'); }
    catch { setMessage('Les préférences restent à enregistrer. Réessayez dans un instant.'); }
    finally { setBusy(false); }
  }

  async function runTest() {
    if (!user || testBusy) return;
    setTestBusy(true); setTestMessage('');
    void trackEvent('push_test_requested', { source: 'settings' });
    let result: Awaited<ReturnType<typeof testPushOnDevice>> = 'error';
    try { result = await testPushOnDevice(user.id); } catch { result = 'error'; }
    void trackEvent('push_test_result', { source: 'settings', metadata: { outcome: result } });
    setTestMessage(result === 'accepted' ? 'Notification envoyée au service de votre appareil. Vérifiez qu’elle apparaît bien sur votre téléphone.'
      : result === 'rate_limited' ? 'Un test vient déjà d’être envoyé. Vous pourrez en relancer un dans cinq minutes.'
      : result === 'uncertain' ? 'L’envoi n’a pas pu être confirmé. Vérifiez votre téléphone avant de réessayer dans cinq minutes.'
      : result === 'rejected' ? 'Le service de votre appareil a refusé la notification. Désactivez puis réactivez les notifications ici.'
      : 'Le test n’a pas pu être lancé. Réessayez dans un instant.');
    setTestBusy(false);
  }

  return <section className="mb-8 rounded-xl border border-border p-4 space-y-4" aria-labelledby="push-heading">
    <div className="flex items-center gap-2"><BellRing className="h-5 w-5" aria-hidden="true" /><h2 id="push-heading" className="font-semibold">Notifications sur cet appareil</h2></div>
    <p className="text-sm text-muted-foreground">Soyez prévenu d’un nouveau message ou d’une candidature, même lorsque Guardiens est fermé. La notification affiche seulement le type d’événement, un nouveau message ou une candidature reçue, et le détail reste dans Guardiens.</p>
    {support === 'ios-install' ? <p className="text-sm">Sur iPhone ou iPad, ajoutez d’abord Guardiens à l’écran d’accueil, puis ouvrez-le depuis son icône. <Link className="underline" to="/settings?section=installation">Voir les étapes d’installation</Link></p>
      : support === 'unsupported' ? <p className="text-sm">Sur cet appareil, vos alertes arrivent par email.</p>
      : <>
        {denied && <p className="text-sm">Les notifications sont bloquées dans les réglages de votre navigateur. Vous pouvez y autoriser Guardiens, puis revenir ici.</p>}
        {!loading && !config.enabled && !message && <p className="text-sm">Les notifications sur cet appareil arrivent bientôt. D’ici là, vos alertes arrivent par email.</p>}
        {(config.enabled || subscribed) && !uncertain && <>
          <div className="flex items-center justify-between gap-4"><Label htmlFor="push-messages">Nouveaux messages</Label><Switch id="push-messages" checked={prefs.messages} disabled={busy} onCheckedChange={(messages) => void save({ ...prefs, messages })} /></div>
          <div className="flex items-center justify-between gap-4"><Label htmlFor="push-applications">Candidatures reçues</Label><Switch id="push-applications" checked={prefs.applications} disabled={busy} onCheckedChange={(applications) => void save({ ...prefs, applications })} /></div>
          {(nearbyAvailable || !subscribed) && <div className="flex items-center justify-between gap-4">
            <Label htmlFor="push-nearby">Nouvelles annonces près de chez moi<span className="block text-xs font-normal text-muted-foreground">Dans le rayon de recherche de votre profil, trois au plus par jour.</span></Label>
            <Switch id="push-nearby" checked={prefs.nearbySits === true} disabled={busy} onCheckedChange={(nearbySits) => void save({ ...prefs, nearbySits })} /></div>}
          <Button variant={subscribed ? 'outline' : 'default'} disabled={busy || loading || (!subscribed && (denied || !config.enabled || (!prefs.messages && !prefs.applications && !prefs.nearbySits)))} onClick={() => void toggle()}>
            {busy ? 'Enregistrement…' : subscribed ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
          </Button>
          {subscribed && <div className="space-y-2">
            <Button variant="outline" disabled={testBusy || busy} onClick={() => void runTest()}>{testBusy ? 'Envoi du test…' : 'Tester sur cet appareil'}</Button>
            {testMessage && <p role="status" className="text-sm">{testMessage}</p>}
          </div>}
        </>}
      </>}
    {loading && <p role="status" className="text-sm">Vérification des notifications…</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {!loading && canRetry && <Button variant="outline" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Réessayer</Button>}
    <p className="text-xs text-muted-foreground">Ce choix concerne uniquement cet appareil. Vos préférences email ci-dessous restent indépendantes.</p>
  </section>;
}
