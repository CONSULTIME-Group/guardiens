import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(
  new URL('../drizzle/migrations/0115_errfix_distance_file_gardiens.sql', import.meta.url),
  'utf8',
);
const db = new PGlite();
await db.exec(`
  CREATE TABLE public.sitter_digest_queue (id serial PRIMARY KEY, distance_km numeric(6, 2));
  INSERT INTO public.sitter_digest_queue (distance_km) VALUES (958.27);
`);
const insert = 'INSERT INTO public.sitter_digest_queue (distance_km) VALUES (16089.12)';

await assert.rejects(db.exec(insert), /numeric field overflow/);

await db.exec(migration);
await db.exec(insert);
await db.exec('INSERT INTO public.sitter_digest_queue (distance_km) VALUES (20015.09)');

const { rows } = await db.query('SELECT distance_km FROM public.sitter_digest_queue ORDER BY id');
assert.deepEqual(rows.map((r) => r.distance_km), ['958.27', '16089.12', '20015.09']);
await db.close();
console.log('3 contrôles verts');
