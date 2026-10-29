import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createDatabase } from '../src/database.mjs';
import website from '../netlify/functions/website.mjs';

test('all Ecommerce Web hashcodes migrate, match, and remain unique', async () => {
  const pg = new PGlite();
  const first = await readFile(new URL('../netlify/database/migrations/0001_wood_origins.sql', import.meta.url), 'utf8');
  const second = await readFile(new URL('../netlify/database/migrations/0002_ecommerce_whatsapp_hashcodes.sql', import.meta.url), 'utf8');
  await pg.exec(first);
  await pg.query('INSERT INTO whatsapp_templates (campaign_name,ad_set_name,ad_name,message,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
    '1 September 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web',
    '1 Sept 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web | Adv+',
    '14 Oct 2026 | Static | MOFU Price Transparency | V3 | HI | Vinyl With No Middleman',
    'BB3C','active','','2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z'
  ]);
  await pg.exec(second);
  await pg.exec(second);
  const rows = (await pg.query("SELECT campaign_name,ad_set_name,ad_name,message FROM whatsapp_templates ORDER BY message")).rows;
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.message), ['A2DD', 'AD0B', 'BB3C']);
  assert(rows.every(row => row.campaign_name.includes('Ecommerce Web')));
  assert(rows.find(row => row.message === 'BB3C').ad_name.includes(' | H1 | '));
  globalThis.__woTestDatabase = createDatabase(async (sql, values) => {
    const result = await pg.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows };
  });
  for (const row of rows) {
    const url = new URL('https://wood-origins.example/api/whatsapp-template');
    url.searchParams.set('campaign', row.campaign_name.toLowerCase());
    url.searchParams.set('adset', row.ad_set_name);
    url.searchParams.set('ad', row.ad_name);
    const result = await (await website(new Request(url), { ip: '192.0.2.3' })).json();
    assert.equal(result.hashcode, row.message);
    url.searchParams.set('campaign', row.campaign_name.replaceAll(' | ', '|'));
    url.searchParams.set('adset', row.ad_set_name.replace('Adv+', 'Adv  '));
    assert.equal((await (await website(new Request(url), { ip: '192.0.2.3' })).json()).hashcode, row.message, 'minor UTM formatting changes still match');
    url.searchParams.set('campaign', 'Slightly different campaign name');
    assert.equal((await (await website(new Request(url), { ip: '192.0.2.3' })).json()).hashcode, row.message, 'unique ad name still matches');
    const landing = new URLSearchParams({ campaign_label: row.campaign_name, group_label: row.ad_set_name.replace('Adv+', 'Adv  '), creative_label: row.ad_name });
    url.searchParams.set('landing', '?' + landing.toString());
    url.searchParams.set('ad', 'Old ad from first-touch storage');
    assert.equal((await (await website(new Request(url), { ip: '192.0.2.3' })).json()).hashcode, row.message, 'current link values match even when parameter names change and stored UTM is stale');
  }
  const sharedAd = rows.find(row => row.message === 'BB3C').ad_name;
  await pg.query('INSERT INTO whatsapp_templates (campaign_name,ad_set_name,ad_name,message,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
    'Another campaign','Another ad set',sharedAd,'OTHER','active','','2026-10-28T00:00:00.000Z','2026-10-28T00:00:00.000Z'
  ]);
  const ambiguous = new URL('https://wood-origins.example/api/whatsapp-template');
  ambiguous.searchParams.set('campaign','Unknown campaign');
  ambiguous.searchParams.set('ad',sharedAd);
  assert.deepEqual(await (await website(new Request(ambiguous), { ip: '192.0.2.3' })).json(), { matched: false, hashcode: '' }, 'reused ad name cannot select the wrong hashcode');
  assert.deepEqual(await (await website(new Request('https://wood-origins.example/api/whatsapp-template?campaign=other'), { ip: '192.0.2.3' })).json(), { matched: false, hashcode: '' });
  delete globalThis.__woTestDatabase;
  await pg.close();
});
