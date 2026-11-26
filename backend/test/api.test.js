import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'research-desk-test-secret';
process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.TAVILY_API_KEY = 'test-tavily-key';
process.env.MISTRAL_API_KEY = 'test-mistral-key';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.BACKEND_URL = 'http://localhost:3000';

const { app } = await import('../src/app.js');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('researchdesk_test'));
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('health endpoint reports a live API and database', async () => {
  const res = await request(app).get('/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.database, 'connected');
});

test('registration validates its inputs', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'ab', email: 'not-an-email', password: '123' });

  assert.equal(res.status, 400);
});

test('registration and duplicate checks work', async () => {
  const register = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'strongpass123',
    });

  assert.equal(register.status, 201);
  assert.equal(register.body.user.username, 'alice');

  const duplicate = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'strongpass123',
    });

  assert.equal(duplicate.status, 400);
});

test('unverified users cannot sign in', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@example.com', password: 'strongpass123' });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /verify/i);
});

test('demo login opens a session with chats and quota', async () => {
  const agent = request.agent(app);

  const demo = await agent.post('/api/auth/demo');
  assert.equal(demo.status, 200);
  assert.ok(demo.body.user);

  const me = await agent.get('/api/auth/get-me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.isDemo, true);

  const quota = await agent.get('/api/auth/quota');
  assert.equal(quota.status, 200);

  const chats = await agent.get('/api/chats');
  assert.equal(chats.status, 200);
  assert.ok(Array.isArray(chats.body.chats));

  const logout = await agent.post('/api/auth/logout');
  assert.equal(logout.status, 200);

  const afterLogout = await agent.get('/api/auth/get-me');
  assert.equal(afterLogout.status, 401);
});

test('protected routes reject guests', async () => {
  const res = await request(app).get('/api/chats');

  assert.equal(res.status, 401);
});

test('unknown public share links return 404', async () => {
  const res = await request(app).get('/api/public/chats/does-not-exist');

  assert.equal(res.status, 404);
});
