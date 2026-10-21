import { getDatabase } from '@netlify/database';

// Keep the existing parameterized D1 query interface while using Netlify Postgres.
export function postgresQuery(sql) {
  let index = 0;
  const ignore = /^INSERT OR IGNORE\b/i.test(sql);
  let text = sql.replace(/^INSERT OR IGNORE\b/i, 'INSERT');
  text = text.replace(/\?/g, () => '$' + (++index));
  text = text.replace(/\bAS (metaPixelId|gtmId|updatedAt)\b/g, 'AS "$1"');
  text = text.replace('SET attempts=attempts+1', 'SET attempts=admin_login_attempts.attempts+1');
  if (ignore) text += ' ON CONFLICT DO NOTHING';
  return text;
}

export function createDatabase(query) {
  return {
    prepare(sql) {
      const execute = async values => query(postgresQuery(sql), values);
      const bind = (...values) => ({
        async first() { return (await execute(values)).rows[0] ?? null; },
        async all() { return { results: (await execute(values)).rows }; },
        async run() { const result = await execute(values); return { meta: { changes: result.rowCount ?? result.rows.length } }; },
      });
      return { ...bind(), bind };
    },
  };
}

let client;
const productionDB = createDatabase(async (text, values) => {
  client ??= getDatabase();
  return client.pool.query(text, values);
});

// Read credentials only at request time; never put them into the browser bundle.
export const env = new Proxy({}, {
  get(_target, key) {
    if (key === 'DB') return globalThis.__woTestDatabase ?? productionDB;
    return process.env[key];
  },
});
