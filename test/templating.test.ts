import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Espresso, Templating, TemplatingError } from '../src/core/index.ts';

test('interpolates and escapes values', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const html = await engine.render(
    'Hi {{ name }}, you said {{ script }} and raw {{{ script }}}',
    { name: 'Alice', script: '<script>x</script>' },
  );
  assert.match(html, /Hi Alice/);
  assert.match(html, /you said &lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /raw <script>x<\/script>/);
});

test('dot-paths and missing values', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const html = await engine.render('{{ user.name }}|{{ nope }}', {
    user: { name: 'Bob' },
  });
  assert.equal(html, 'Bob|');
});

test('#if / else renders the right branch', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const yes = await engine.render('{{ #if admin }}ADMIN{{ else }}USER{{ /if }}', { admin: true });
  const no = await engine.render('{{ #if admin }}ADMIN{{ else }}USER{{ /if }}', { admin: false });
  assert.equal(yes, 'ADMIN');
  assert.equal(no, 'USER');
});

test('#each iterates with @index and scoped lookups', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const html = await engine.render(
    '{{ #each users }}[{{ @index }}:{{ name }}]{{ else }}EMPTY{{ /each }}',
    { users: [{ name: 'a' }, { name: 'b' }] },
  );
  assert.equal(html, '[0:a][1:b]');
});

test('#each else branch for empty arrays', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const html = await engine.render('{{ #each users }}x{{ else }}EMPTY{{ /each }}', {
    users: [],
  });
  assert.equal(html, 'EMPTY');
});

test('generic section renders object context', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const html = await engine.render('{{ #user }}{{ name }}{{ /user }}', {
    user: { name: 'Carol' },
  });
  assert.equal(html, 'Carol');
});

test('inverted section renders when falsy', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  const html = await engine.render('{{ ^users }}none{{ /users }}', { users: [] });
  assert.equal(html, 'none');
});

test('partials render from views/partials with fallback to parent scope', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'espresso-views-'));
  const viewsDir = join(dir, 'views');
  const partialsDir = join(viewsDir, 'partials');
  await mkdir(partialsDir, { recursive: true });
  await writeFile(
    join(viewsDir, 'page.espresso'),
    '{{ partial "header" }}<main>{{ name }}</main>{{ partial "footer" }}',
  );
  await writeFile(join(partialsDir, 'header.espresso'), '<header>{{ title }}</header>');
  await writeFile(join(partialsDir, 'footer.html'), '<footer>&copy; 2026</footer>');
  try {
    const engine = new Templating({ viewsDir, partialsDir });
    const html = await engine.renderFile('page', { title: 'T', name: 'N' });
    assert.equal(html, '<header>T</header><main>N</main><footer>&copy; 2026</footer>');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('partial data path overrides context', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'espresso-views-'));
  const viewsDir = join(dir, 'views');
  const partialsDir = join(viewsDir, 'partials');
  await mkdir(partialsDir, { recursive: true });
  await writeFile(join(viewsDir, 'page.espresso'), '{{ partial "card" item }}');
  await writeFile(join(partialsDir, 'card.espresso'), '<b>{{ name }}</b>');
  try {
    const engine = new Templating({ viewsDir, partialsDir });
    const html = await engine.renderFile('page', { item: { name: 'Zed' } });
    assert.equal(html, '<b>Zed</b>');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('circular partials throw', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'espresso-views-'));
  const viewsDir = join(dir, 'views');
  const partialsDir = join(viewsDir, 'partials');
  await mkdir(partialsDir, { recursive: true });
  await writeFile(join(partialsDir, 'a.espresso'), '{{ partial "b" }}');
  await writeFile(join(partialsDir, 'b.espresso'), '{{ partial "a" }}');
  try {
    const engine = new Templating({ viewsDir, partialsDir });
    await assert.rejects(() => engine.renderPartial('a'), TemplatingError);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('prefers .espresso over .html when both exist', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'espresso-views-'));
  const viewsDir = join(dir, 'views');
  await mkdir(viewsDir, { recursive: true });
  await writeFile(join(viewsDir, 'page.espresso'), 'espresso');
  await writeFile(join(viewsDir, 'page.html'), 'html');
  try {
    const engine = new Templating({ viewsDir });
    assert.equal(await engine.renderFile('page'), 'espresso');
    assert.equal(await engine.renderFile('page.html'), 'html');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('missing template throws TemplatingError', async () => {
  const engine = new Templating({ viewsDir: tmpdir() });
  await assert.rejects(() => engine.renderFile('nope'), TemplatingError);
});

test('ctx.view renders .espresso with partials end to end', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'espresso-app-'));
  const viewsDir = join(dir, 'views');
  await mkdir(join(viewsDir, 'partials'), { recursive: true });
  await writeFile(join(viewsDir, 'index.espresso'), '{{ partial "header" }}<h1>{{ title }}</h1>');
  await writeFile(join(viewsDir, 'partials', 'header.espresso'), '<header>{{ title }}</header>');
  try {
    const app = new Espresso({ viewsDir });
    app.get('/', ({ view }) => view('index', { title: 'T' }));
    const res = await app.handle(new Request('http://localhost/'));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '<header>T</header><h1>T</h1>');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});