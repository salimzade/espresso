import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDefaults, validate, type SchemaDefinition } from '../src/core/libs/mongo/index.ts';
import { Model, MongoModelError } from '../src/core/libs/mongo/index.ts';

const userSchema: SchemaDefinition = {
  name: { type: 'string', required: true, minLength: 2 },
  email: { type: 'string', required: true, match: /.+@.+/ },
  age: { type: 'number', min: 0, default: 18 },
  isAdmin: { type: 'boolean', default: false },
  tags: { type: 'array', items: 'string' },
  createdAt: { type: 'date' },
};

test('schema defaults are applied', () => {
  const data = applyDefaults({ name: 'Alice', email: 'alice@espresso.dev' }, userSchema);
  assert.equal(data.age, 18);
  assert.equal(data.isAdmin, false);
  assert.equal(data.createdAt, undefined);
});

test('schema validation passes for valid data', () => {
  const errors = validate(
    { name: 'Alice', email: 'alice@espresso.dev', age: 25, tags: ['admin'] },
    userSchema,
  );
  assert.equal(errors, null);
});

test('schema validation reports missing and invalid fields', () => {
  const errors = validate(
    { name: 'A', email: 'not-an-email', age: -1, tags: [1] },
    userSchema,
  );
  assert.ok(errors);
  assert.match(errors.name, /at least 2/);
  assert.match(errors.email, /pattern/);
  assert.match(errors.age, />= 0/);
  assert.match(errors.tags, /string/);
});

test('model throws when used before connecting', async () => {
  const users = new Model('user', userSchema);
  await assert.rejects(() => users.find(), /MongoDB is not connected/);
});

test('model validation failure throws MongoModelError', async () => {
  const users = new Model('user', userSchema);
  await assert.rejects(
    () => users.create({ name: 'X', email: 'nope' } as never),
    (err: unknown) => err instanceof MongoModelError && 'name' in err.fields,
  );
});

test('pluralized collection name', () => {
  const users = new Model('user', userSchema);
  assert.equal(users.collectionName, 'users');
  const categories = new Model('category', { title: 'string' });
  assert.equal(categories.collectionName, 'categories');
  const custom = new Model('user', userSchema, 'accounts');
  assert.equal(custom.collectionName, 'accounts');
});