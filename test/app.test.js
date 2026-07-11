const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const mock = require('mock-require');
const supertest = require('supertest');

// Force the weather route down the "no key" (503) path by default. dotenv will
// not override an already-set env var, so the user's real key in .env is unused.
process.env.OPENWEATHER_API_KEY = '';

// Mock Prisma so routes run without a live database.
const PASSWORD = 'password123';
const fakeUser = { id: 1, email: 'user@example.com', password: bcrypt.hashSync(PASSWORD, 10) };
const prismaMock = {
  user: {
    create: async ({ data }) => ({ id: 1, email: data.email }),
    findUnique: async () => fakeUser,
  },
  task: {
    findMany: async () => [],
    create: async ({ data }) => ({ id: 1, ...data }),
    findUnique: async () => ({ id: 1, userId: 1, title: 't', status: 'pending' }),
    update: async ({ where, data }) => ({ id: where.id, userId: 1, ...data }),
    delete: async () => ({}),
  },
};
mock('@prisma/client', { PrismaClient: class { constructor() { Object.assign(this, prismaMock); } } });

// Mock the upstream weather call so the happy path needs no real key/network.
global.fetch = async () => ({
  status: 200,
  ok: true,
  json: async () => ({
    name: 'London', sys: { country: 'GB' }, main: { temp: 10, feels_like: 9, humidity: 50 },
    weather: [{ description: 'cloudy' }], wind: { speed: 2 },
  }),
});

const app = require('../index');
const request = supertest(app);

test('GET /health returns ok', async () => {
  const res = await request.get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('unknown route returns 404', async () => {
  const res = await request.get('/nope');
  assert.strictEqual(res.status, 404);
});

test('GET /api/weather without token -> 401', async () => {
  const res = await request.get('/api/weather?city=London');
  assert.strictEqual(res.status, 401);
});

test('GET /api/weather with token but no key -> 503', async () => {
  const reg = await request.post('/auth/register').send({ email: 'w@x.com', password: 'pw' });
  const res = await request.get('/api/weather?city=London').set('Authorization', `Bearer ${reg.body.token}`);
  assert.strictEqual(res.status, 503);
});

test('GET /api/weather with key + mocked upstream -> 200', async () => {
  process.env.OPENWEATHER_API_KEY = 'dummy-key';
  const reg = await request.post('/auth/register').send({ email: 'wx@wx.com', password: 'pw' });
  const res = await request.get('/api/weather?city=London').set('Authorization', `Bearer ${reg.body.token}`);
  process.env.OPENWEATHER_API_KEY = '';
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.city, 'London');
  assert.strictEqual(res.body.country, 'GB');
});

test('POST /auth/register -> 201 with token', async () => {
  const res = await request.post('/auth/register').send({ email: 'a@b.com', password: 'pw' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
});

test('POST /auth/login wrong password -> 401', async () => {
  const res = await request.post('/auth/login').send({ email: 'user@example.com', password: 'wrong' });
  assert.strictEqual(res.status, 401);
});

test('POST /auth/login correct password -> 200 with token', async () => {
  const res = await request.post('/auth/login').send({ email: 'user@example.com', password: PASSWORD });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
});

test('logout revokes the token; reuse -> 401', async () => {
  const reg = await request.post('/auth/register').send({ email: 'lo@go.com', password: 'pw' });
  const token = reg.body.token;
  const out = await request.post('/auth/logout').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(out.status, 200);
  const after = await request.get('/tasks').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(after.status, 401);
});

test('PUT /tasks/:id with invalid status -> 400', async () => {
  const reg = await request.post('/auth/register').send({ email: 'v@v.com', password: 'pw' });
  const res = await request.put('/tasks/1').set('Authorization', `Bearer ${reg.body.token}`).send({ status: 'bogus' });
  assert.strictEqual(res.status, 400);
});

test('POST /tasks with empty title -> 400', async () => {
  const reg = await request.post('/auth/register').send({ email: 'e@e.com', password: 'pw' });
  const res = await request.post('/tasks').set('Authorization', `Bearer ${reg.body.token}`).send({ title: '   ' });
  assert.strictEqual(res.status, 400);
});
