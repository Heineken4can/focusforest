import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { configureApp } from '../src/bootstrap';

describe('Rewards, Profile, Metrics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create a test user and get token
    const signupResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Test User',
      });
    
    accessToken = signupResponse.body.data.accessToken;
    userId = signupResponse.body.data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  describe('Rewards', () => {
    it('/api/v1/rewards/stats (GET) should return stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/rewards/stats')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('today');
      expect(response.body.data).toHaveProperty('progress');
    });

    it('/api/v1/rewards/ledger (GET) should return ledger', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/rewards/ledger')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('items');
    });
  });

  describe('Profile & Settings', () => {
    it('/api/v1/profile (GET) should return profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.displayName).toBe('Test User');
    });

    it('/api/v1/profile (PATCH) should update profile', async () => {
      const getResponse = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const version = getResponse.body.data.version;

      const response = await request(app.getHttpServer())
        .patch('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version,
          displayName: 'Updated Name',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.displayName).toBe('Updated Name');
      expect(response.body.data.version).toBe(version + 1);
    });

    it('/api/v1/settings (GET) should return settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('theme');
    });

    it('/api/v1/settings (PATCH) should update settings', async () => {
      const getResponse = await request(app.getHttpServer())
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const version = getResponse.body.data.version;

      const response = await request(app.getHttpServer())
        .patch('/api/v1/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version,
          theme: 'DARK',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.theme).toBe('DARK');
    });
  });

  describe('Metrics', () => {
    it('/api/v1/metrics/events (POST) should collect events', async () => {
      const eventId = `0195d7fe-f19b-7e63-8f0a-${Date.now().toString().slice(-12)}`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/metrics/events')
        .send({
          deviceId: 'test-device',
          events: [
            {
              eventId,
              eventName: 'APP_FIRST_OPEN',
              occurredAt: new Date().toISOString(),
              deviceId: 'test-device',
            },
          ],
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.acceptedEventIds).toContain(eventId);
    });

    it('/api/v1/metrics/events (POST) should deduplicate events', async () => {
      const eventId = `0195d7fe-f19b-7e63-8f0a-${(Date.now() + 1).toString().slice(-12)}`;
      
      // First send
      await request(app.getHttpServer())
        .post('/api/v1/metrics/events')
        .send({
          deviceId: 'test-device',
          events: [
            {
              eventId,
              eventName: 'AUTH_LOGIN_SUCCESS',
              occurredAt: new Date().toISOString(),
              deviceId: 'test-device',
            },
          ],
        });
      
      // Second send (duplicate)
      const response = await request(app.getHttpServer())
        .post('/api/v1/metrics/events')
        .send({
          deviceId: 'test-device',
          events: [
            {
              eventId,
              eventName: 'AUTH_LOGIN_SUCCESS',
              occurredAt: new Date().toISOString(),
              deviceId: 'test-device',
            },
          ],
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.acceptedEventIds).not.toContain(eventId);
      expect(response.body.data.deduplicatedEventIds).toContain(eventId);
    });
  });
});
