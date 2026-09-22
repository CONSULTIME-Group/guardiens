import { describe, it, expect } from 'vitest';
import {
  nearbyRadiusKm,
  selectNearbyOpenSits,
  type OpenSitRow,
} from '../../supabase/functions/_shared/nearby-open-sits.ts';

// Lyon
const VIEWER = { latitude: 45.764, longitude: 4.8357, declaredRadiusKm: null };
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
    status: 'published',
    accepting_applications: true,
    hidden_at: null,
    moderation_hidden_at: null,
    ...atKm(10),
    ...over,
  };
}

describe('selectNearbyOpenSits', () => {
  it('aucune annonce, motif explicite', () => {
    const r = selectNearbyOpenSits([], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(0);
    expect(r.reason).toBe('no_open_sit_nearby');
  });

  it('gardien sans coordonnées, motif distinct', () => {
    const r = selectNearbyOpenSits([sit()], { latitude: null, longitude: null }, { nowIso: NOW });
    expect(r.reason).toBe('no_coordinates');
  });

  it('annonce à 49 km retenue', () => {
    const r = selectNearbyOpenSits([sit({ ...atKm(49) })], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(1);
    expect(r.sits[0].distanceKm).toBe(49);
    expect(r.sits[0].url).toBe('https://guardiens.fr/sits/garde-lyon');
  });

  it('annonce à 51 km écartée', () => {
    const r = selectNearbyOpenSits([sit({ ...atKm(51) })], VIEWER, { nowIso: NOW });
    expect(r.sits).toHaveLength(0);
    expect(r.reason).toBe('no_open_sit_nearby');
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

  it('rayon déclaré plus petit respecté', () => {
    const rows = [sit({ id: 'a', ...atKm(20) })];
    expect(selectNearbyOpenSits(rows, { ...VIEWER, declaredRadiusKm: 10 }, { nowIso: NOW }).sits).toHaveLength(0);
    expect(selectNearbyOpenSits(rows, { ...VIEWER, declaredRadiusKm: 25 }, { nowIso: NOW }).sits).toHaveLength(1);
  });

  it('trois annonces au plus, les plus proches d\'abord', () => {
    const rows = [30, 5, 20, 12].map((km, i) => sit({ id: `s${i}`, slug: `s${i}`, ...atKm(km) }));
    const r = selectNearbyOpenSits(rows, VIEWER, { nowIso: NOW });
    expect(r.sits.map((s) => s.distanceKm)).toEqual([5, 12, 20]);
  });
});

describe('nearbyRadiusKm', () => {
  it('30 km est lu comme un silence et reste plafonné à 50', () => {
    expect(nearbyRadiusKm(30)).toBe(50);
    expect(nearbyRadiusKm(null)).toBe(50);
  });
  it('un rayon déclaré plus petit est respecté', () => {
    expect(nearbyRadiusKm(15)).toBe(15);
  });
});
