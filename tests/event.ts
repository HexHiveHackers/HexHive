// Test-only helpers for synthesizing the structural event shape that our
// handlers' internal `handle*` functions accept. Endpoints export a
// thin RequestHandler wrapper; tests import the inner function directly.
//
// Importantly: this file contains no `as any` and no `as unknown`. The
// handlers' internal functions are typed broadly enough that test events
// flow in without coercion.

export interface TestEvent {
  request: Request;
  locals: App.Locals;
  url: URL;
  params: Record<string, string>;
}

const DEFAULT_USER: App.Locals['user'] = {
  id: 'u1',
  name: 'Test',
  email: 't@x',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function buildEvent(args: {
  body?: unknown;
  user?: App.Locals['user'] | null;
  url?: string;
  params?: Record<string, string>;
}): TestEvent {
  const url = args.url ?? 'http://x';
  return {
    request:
      args.body === undefined
        ? new Request(url)
        : new Request(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(args.body),
          }),
    locals: {
      user: args.user === undefined ? DEFAULT_USER : args.user,
      session: null,
    },
    url: new URL(url),
    params: args.params ?? {},
  };
}
