import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/database';

// Requires: MONGODB_URI, JWT_SECRET, CORS_ORIGIN set in env (see CI yml)

const app = createApp();

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await disconnectDatabase();
});

describe('POST /api/v1/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin@fleet.test',
        password: 'Password1',
        role: 'Admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined(); // never exposed
    expect(res.body.data.user.role).toBe('Admin');
  });

  it('rejects duplicate email with 409', async () => {
    const payload = {
      name: 'Dupe User',
      email: 'dupe@fleet.test',
      password: 'Password1',
    };
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects weak password with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Weak', email: 'weak@fleet.test', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Login Test',
      email: 'login@fleet.test',
      password: 'Password1',
    });
  });

  it('returns a token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@fleet.test', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@fleet.test', password: 'WrongPass9' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
