import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/database';

const app = createApp();
let adminToken: string;

beforeAll(async () => {
  await connectDatabase();

  // Seed an admin user and grab token
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'VehicleAdmin', email: 'vadmin@fleet.test', password: 'Password1', role: 'Admin' });

  adminToken = res.body.data.token as string;
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await disconnectDatabase();
});

const VALID_VEHICLE = {
  name: 'Truck 01',
  make: 'Ford',
  model: 'F-150',
  year: 2022,
  vin: '1FTFW1ET0EFC12345',
  licensePlate: 'ABC-1234',
  fuelType: 'gasoline',
  fuelCapacityLiters: 100,
};

describe('POST /api/v1/vehicles', () => {
  it('creates a vehicle for Admin', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(VALID_VEHICLE);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vin).toBe('1FTFW1ET0EFC12345');
  });

  it('rejects invalid VIN with 400', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...VALID_VEHICLE, vin: 'INVALID', licensePlate: 'XYZ-999' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .send(VALID_VEHICLE);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/vehicles', () => {
  it('lists vehicles with pagination meta', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: expect.any(Number),
      total: expect.any(Number),
    });
  });
});
