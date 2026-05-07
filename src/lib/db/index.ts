import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

// The client is constructed on first access, not at module load. SvelteKit's
// post-build `analyse` step imports every server module to discover routes;
// constructing a libSQL client at import time would crash that pass on a
// build host where DATABASE_URL isn't defined.
let cached: DB | undefined;
function get(): DB {
  if (!cached) {
    cached = drizzle(
      createClient({
        url: env.DATABASE_URL,
        authToken: env.DATABASE_AUTH_TOKEN || undefined,
      }),
      { schema },
    );
  }
  return cached;
}

export const db: DB = new Proxy({} as DB, {
  get: (_t, prop, receiver) => Reflect.get(get(), prop, receiver),
  has: (_t, prop) => Reflect.has(get(), prop),
});

export { schema };
