import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TableClient } from '@azure/data-tables';
import { getUserFromRequest } from './utils/auth.js';

interface ProfileEntity {
  partitionKey: string;
  rowKey: string;
  xp: number;
  level: number;
  streak: number;
  lastLoginDate: string;
  badges: string;
}

interface UserProfile {
  userId: string;
  xp: number;
  level: number;
  streak: number;
  lastLoginDate: string;
  badges: string[];
}

function getTableClient(): TableClient {
  return TableClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!,
    'UserProfile',
  );
}

function defaultProfile(userId: string): UserProfile {
  return {
    userId,
    xp: 0,
    level: 0,
    streak: 0,
    lastLoginDate: '',
    badges: [],
  };
}

function entityToProfile(entity: ProfileEntity): UserProfile {
  return {
    userId: entity.partitionKey,
    xp: entity.xp ?? 0,
    level: entity.level ?? 0,
    streak: entity.streak ?? 0,
    lastLoginDate: entity.lastLoginDate ?? '',
    badges: entity.badges ? JSON.parse(entity.badges) : [],
  };
}

export async function handleProfile(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const user = getUserFromRequest(req);
  if (!user) return { status: 401, body: 'Unauthorized' };

  const client = getTableClient();

  if (req.method === 'GET') {
    try {
      const entity = await client.getEntity<ProfileEntity>(user.userId, 'profile');
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityToProfile(entity)),
      };
    } catch (err: unknown) {
      // 404 = first-time user, return defaults
      if ((err as { statusCode?: number }).statusCode === 404) {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultProfile(user.userId)),
        };
      }
      context.error('getProfile failed', err);
      return { status: 500, body: 'Failed to load profile' };
    }
  }

  if (req.method === 'PUT') {
    try {
      const update = (await req.json()) as Partial<UserProfile>;

      // Fetch existing to merge
      let existing: UserProfile;
      try {
        const entity = await client.getEntity<ProfileEntity>(user.userId, 'profile');
        existing = entityToProfile(entity);
      } catch {
        existing = defaultProfile(user.userId);
      }

      const merged: UserProfile = { ...existing, ...update, userId: user.userId };

      const entity: ProfileEntity = {
        partitionKey: user.userId,
        rowKey: 'profile',
        xp: merged.xp,
        level: merged.level,
        streak: merged.streak,
        lastLoginDate: merged.lastLoginDate,
        badges: JSON.stringify(merged.badges),
      };

      await client.upsertEntity(entity, 'Replace');
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      };
    } catch (err) {
      context.error('putProfile failed', err);
      return { status: 500, body: 'Failed to save profile' };
    }
  }

  return { status: 405 };
}

app.http('profile', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'profile',
  handler: handleProfile,
});
