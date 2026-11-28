import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'library-test-secret';
process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.TAVILY_API_KEY = 'test-tavily-key';
process.env.MISTRAL_API_KEY = 'test-mistral-key';
process.env.BACKEND_URL = 'http://localhost:3000';

const { app } = await import('../src/app.js');
const { userModel } = await import('../src/models/user.model.js');

let mongod;
let token;
let otherToken;

const pollJob = async (jobId, cookie) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await request(app)
      .get(`/api/library/jobs/${jobId}`)
      .set('Cookie', cookie);
    if (response.status !== 200) return response;
    if (['ready', 'failed'].includes(response.body.job.status)) return response;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Ingestion job did not finish.');
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('researchdesk_library_test'));

  const user = await userModel.create({
    username: 'library-reader',
    email: 'library@example.com',
    password: 'password123',
    verified: true
  });
  const other = await userModel.create({
    username: 'other-reader',
    email: 'other@example.com',
    password: 'password123',
    verified: true
  });

  token = jwt.sign({ id: user._id.toString(), tokenVersion: 0 }, process.env.JWT_SECRET);
  otherToken = jwt.sign({ id: other._id.toString(), tokenVersion: 0 }, process.env.JWT_SECRET);
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('uploads a document, indexes chunks, searches it, and exposes a public source', async () => {
  const cookie = `token=${token}`;
  const content = `
    Refund policy for the Atlas plan.

    Customers may request a refund within 14 days of purchase. Refunds are returned to the original payment method.
    Enterprise contracts follow the signed order form.

    Support response times are four business hours for the Atlas plan.
  `;

  const upload = await request(app)
    .post('/api/library/documents')
    .set('Cookie', cookie)
    .send({ title: 'Atlas plan policy', content, kind: 'text' });

  assert.equal(upload.status, 202);
  assert.equal(upload.body.document.status, 'queued');

  const job = await pollJob(upload.body.job.id, cookie);
  assert.equal(job.status, 200);
  assert.equal(job.body.job.status, 'ready');

  const list = await request(app).get('/api/library/documents').set('Cookie', cookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.documents.length, 1);
  assert.equal(list.body.documents[0].status, 'ready');
  assert.ok(list.body.documents[0].chunkCount >= 1);

  const search = await request(app)
    .get('/api/library/search')
    .query({ q: 'refund original payment method' })
    .set('Cookie', cookie);
  assert.equal(search.status, 200);
  assert.ok(search.body.results.length >= 1);
  assert.equal(search.body.results[0].documentTitle, 'Atlas plan policy');
  assert.ok(search.body.results[0].shareId);

  const publicSource = await request(app).get(`/api/public/library/${search.body.results[0].shareId}`);
  assert.equal(publicSource.status, 200);
  assert.equal(publicSource.body.title, 'Atlas plan policy');
  assert.match(publicSource.body.content, /refund/i);

  const otherList = await request(app)
    .get('/api/library/documents')
    .set('Cookie', `token=${otherToken}`);
  assert.equal(otherList.status, 200);
  assert.equal(otherList.body.documents.length, 0);

  const deleteResponse = await request(app)
    .delete(`/api/library/documents/${upload.body.document.id}`)
    .set('Cookie', cookie);
  assert.equal(deleteResponse.status, 200);

  const afterDelete = await request(app).get('/api/library/documents').set('Cookie', cookie);
  assert.equal(afterDelete.body.documents.length, 0);
});

test('rejects empty documents and unauthenticated library access', async () => {
  const unauthenticated = await request(app).get('/api/library/documents');
  assert.equal(unauthenticated.status, 401);

  const empty = await request(app)
    .post('/api/library/documents')
    .set('Cookie', `token=${token}`)
    .send({ title: 'Empty', content: 'short' });
  assert.equal(empty.status, 400);
});
