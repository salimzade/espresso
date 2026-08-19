import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Espresso, logger as createLogger } from '../src/core/index.ts';
import type { LogEntry } from '../src/core/index.ts';
import { userRoute, logger } from '../src/api/index.ts';

function build() {
  const app = new Espresso();
  app
    .use(logger)
    .mount('/api/users', userRoute)
    .get('/', () => ({ hello: 'world' }))
    .get('/users/:id', ({ params, query }) => ({ id: params.id, admin: query.get('admin') }))
    .all('/echo', async (ctx) => ({ method: ctx.method, body: await ctx.body }));
  return app;
}

test('typed params and query', async () => {
  const res = await build().handle(new Request('http://localhost/users/42?admin=true'));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: '42', admin: 'true' });
});

test('json body is parsed', async () => {
  const res = await build().handle(
    new Request('http://localhost/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    }),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { method: 'POST', body: { name: 'Alice' } });
});

test('CRUD on mounted sub-app', async () => {
  const app = build();
  const created = await app.handle(
    new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Carol', email: 'carol@espresso.dev' }),
    }),
  );
  assert.equal(created.status, 201);
  const carol = await created.json();
  assert.equal(carol.name, 'Carol');

  const list = await app.handle(new Request('http://localhost/api/users'));
  assert.equal((await list.json()).length, 3);

  const updated = await app.handle(
    new Request(`http://localhost/api/users/${carol.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Carol C.' }),
    }),
  );
  assert.equal((await updated.json()).name, 'Carol C.');

  const deleted = await app.handle(new Request(`http://localhost/api/users/${carol.id}`, { method: 'DELETE' }));
  assert.equal(deleted.status, 200);
});

test('404 for unknown routes', async () => {
  const res = await build().handle(new Request('http://localhost/nope'));
  assert.equal(res.status, 404);
});

test('views render with interpolation', async () => {
  const app = new Espresso();
  app.get('/', ({ view }) => view('index', { title: 'Test' }));
  const res = await app.handle(new Request('http://localhost/'));
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<title>Test - espresso<\/title>/);
});

test('static files are served', async () => {
  const app = new Espresso();
  app.assets('/assets');
  const res = await app.handle(new Request('http://localhost/assets/css/style.css'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/css/);
});

test('middleware can short-circuit', async () => {
  const app = new Espresso();
  app.use((ctx) => ctx.json({ blocked: true }, 401));
  app.get('/', () => ({ ok: true }));
  const res = await app.handle(new Request('http://localhost/'));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { blocked: true });
});

test('logger emits an entry and logs thrown errors', async () => {
  const entries: LogEntry[] = [];
  const app = new Espresso();
  app.use(createLogger({ timestamp: 'none', colors: false, onLog: (e) => entries.push(e) }));
  app
    .get('/ok', () => ({ ok: true }))
    .get('/boom', () => {
      throw new Error('kaboom');
    });

  const ok = await app.handle(new Request('http://localhost/ok'));
  assert.equal(ok.status, 200);
  const boom = await app.handle(new Request('http://localhost/boom'));
  assert.equal(boom.status, 500);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].method, 'GET');
  assert.equal(entries[0].status, 200);
  assert.ok(entries[0].sizeBytes! > 0);
  assert.equal(entries[1].status, 500);
  assert.match((entries[1].error as Error).message, /kaboom/);
});