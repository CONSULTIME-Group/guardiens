import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  disablePush, enablePush, getPushConfig, getPushState, pushSupport, updatePushPreferences,
  type PushConfig, type PushPreferences,
} from '@/lib/web-push';

export default function PushNotificationsSection() {
  const { user } = useAuth();
  const [config, setConfig] = useState<PushConfig>({ enabled: false });
  const [prefs, setPrefs] = useState<PushPreferences>({ messages: true, applications: true });
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
    setConfig({ enabled: false }); setSubscribed(false); setMessage(''); setLoading(true); setCanRetry(false);
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
      setConfig(settings); setSubscribed(state.subscribed); setPrefs({ messages: state.messages, applications: state.applications });
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
      if (subscribed) { await disablePush(user.id); setSubscribed(false); setMessage('Notifications désactivées sur cet appareil.'); }
      else { await enablePush(user.id, config, prefs); setSubscribed(true); setMessage('Notifications activées sur cet appareil.'); }
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'push_permission_denied'
        ? 'Autorisation non accordée. Vous pouvez la modifier dans les réglages de votre navigateur.'
        : 'La modification n’a pas abouti. Réessayez dans un instant. Vos emails restent inchangés.');
    } finally { setBusy(false); }
  }

  async function save(next: PushPreferences) {
    if (!user || busy) return;
    if (!subscribed) { setPrefs(next); return; }
    setBusy(true); setMessage('');
    try { await updatePushPreferences(user.id, next); setPrefs(next); setMessage('Préférences enregistrées pour cet appareil.'); }
    catch { setMessage('Préférences non enregistrées. Réessayez dans un instant.'); }
    finally { setBusy(false); }
  }

  return <section className="mb-8 rounded-xl border border-border p-4 space-y-4" aria-labelledby="push-heading">
    <div className="flex items-center gap-2"><BellRing className="h-5 w-5" aria-hidden="true" /><h2 id="push-heading" className="font-semibold">Notifications sur cet appareil</h2></div>
    <p className="text-sm text-muted-foreground">Soyez prévenu d’un nouveau message ou d’une candidature, même lorsque Guardiens est fermé. Aucun nom ni contenu privé n’apparaît dans l’alerte.</p>
    {support === 'ios-install' ? <p className="text-sm">Sur iPhone ou iPad, ajoutez d’abord Guardiens à l’écran d’accueil, puis ouvrez-le depuis son icône. <Link className="underline" to="/settings?section=installation">Voir les étapes d’installation</Link></p>
      : support === 'unsupported' ? <p className="text-sm">Ce navigateur ne permet pas les notifications sur cet appareil. Vos emails restent disponibles.</p>
      : <>
        {denied && <p className="text-sm">Les notifications sont bloquées dans les réglages de votre navigateur. Vous pouvez y autoriser Guardiens, puis revenir ici.</p>}
        {!loading && !config.enabled && !message && <p className="text-sm">Les notifications sur cet appareil ne sont pas encore disponibles. Vos emails restent inchangés.</p>}
        {(config.enabled || subscribed) && <>
          <div className="flex items-center justify-between gap-4"><Label htmlFor="push-messages">Nouveaux messages</Label><Switch id="push-messages" checked={prefs.messages} disabled={busy} onCheckedChange={(messages) => void save({ ...prefs, messages })} /></div>
          <div className="flex items-center justify-between gap-4"><Label htmlFor="push-applications">Candidatures reçues</Label><Switch id="push-applications" checked={prefs.applications} disabled={busy} onCheckedChange={(applications) => void save({ ...prefs, applications })} /></div>
          <Button variant={subscribed ? 'outline' : 'default'} disabled={busy || loading || (!subscribed && (denied || !config.enabled || (!prefs.messages && !prefs.applications)))} onClick={() => void toggle()}>
            {busy ? 'Enregistrement…' : subscribed ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
          </Button>
        </>}
      </>}
    {loading && <p role="status" className="text-sm">Vérification des notifications…</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {!loading && canRetry && <Button variant="outline" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Réessayer</Button>}
    <p className="text-xs text-muted-foreground">Ce choix concerne uniquement cet appareil. Vos préférences email ci-dessous restent indépendantes.</p>
  </section>;
}
