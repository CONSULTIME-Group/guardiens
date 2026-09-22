import { describe, it, expect } from 'vitest';
import {
  selectNearbyOpenSits,
  type OpenSitRow,
} from '../../supabase/functions/_shared/nearby-open-sits.ts';

// Lyon
const VIEWER = { latitude: 45.764, longitude: 4.8357 };
const NOW = '2026-09-22T10:00:00.000Z';

// Un degré de latitude vaut environ 111,2 km.
function atKm(km: number): { owner_latitude: number; owner_longitude: number } {
  return { owner_latitude: VIEWER.latitude + km / 111.2, owner_longitude: VIEWER.longitude };
}

function sit(over: Partial<OpenSitRow> = {}): OpenSitRow {
  return {
    id: 'sit-1',
    slug: 'garde-lyon',
    title: 'Garde de deux chats',
    city: 'Lyon',
    start_date: '2026-10-10',
    end_date: '2026-10-17',
    created_at: '2026-09-01T00:00:00.000Z',
    status: 'published',
    accepting_applications: true,
    hidden_at: null,
    moderation_hidden_at: null,
    ...atKm(10),
    ...over,
  };
}

describe('selectNearbyOpenSits', () => {
  it('aucune annonce ouverte en France, motif explicite', () => {
    const r = selectNearbyOpenSits([], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(0);
    expect(r.reason).toBe('no_open_sit');
  });

  it('annonce à 300 km retenue, la distance reste affichée', () => {
    const r = selectNearbyOpenSits([sit({ ...atKm(300) })], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(1);
    expect(r.sits[0].distanceKm).toBe(300);
    expect(r.sits[0].url).toBe('https://guardiens.fr/sits/garde-lyon');
  });

  it('gardien sans coordonnées : les annonces les plus récentes, sans distance', () => {
    const rows = [
      sit({ id: 'a', slug: 'a', created_at: '2026-09-01T00:00:00.000Z' }),
      sit({ id: 'b', slug: 'b', created_at: '2026-09-20T00:00:00.000Z' }),
      sit({ id: 'c', slug: 'c', created_at: '2026-09-10T00:00:00.000Z' }),
      sit({ id: 'd', slug: 'd', created_at: '2026-08-01T00:00:00.000Z' }),
    ];
    const r = selectNearbyOpenSits(rows, { latitude: null, longitude: null }, { nowIso: NOW });
    expect(r.reason).toBeNull();
    expect(r.sits.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(r.sits.every((s) => s.distanceKm === null)).toBe(true);
  });

  it('annonce passée écartée', () => {
    const r = selectNearbyOpenSits([sit({ start_date: '2026-09-01' })], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(0);
  });

  it('annonce masquée écartée, par le propriétaire comme par la modération', () => {
    expect(selectNearbyOpenSits([sit({ hidden_at: NOW })], VIEWER, { nowIso: NOW }).sits).toHaveLength(0);
    expect(selectNearbyOpenSits([sit({ moderation_hidden_at: NOW })], VIEWER, { nowIso: NOW }).sits).toHaveLength(0);
  });

  it('annonce fermée aux candidatures écartée', () => {
    const r = selectNearbyOpenSits([sit({ accepting_applications: false })], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(0);
  });

  it('trois annonces au plus, les plus proches d\'abord, même très loin', () => {
    const rows = [300, 5, 220, 120].map((km, i) => sit({ id: `s${i}`, slug: `s${i}`, ...atKm(km) }));
    const r = selectNearbyOpenSits(rows, VIEWER, { nowIso: NOW });
    expect(r.sits.map((s) => s.distanceKm)).toEqual([5, 120, 220]);
    expect(r.nearestKm).toBe(5);
  });
});
