import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { TableClient } from '@azure/data-tables';
import { getUserFromRequest } from '../shared/auth';

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
  return { userId, xp: 0, level: 0, streak: 0, lastLoginDate: '', badges: [] };
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

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const user = getUserFromRequest(req);
  if (!user) {
    context.res = { status: 401, body: 'Unauthorized' };
    return;
  }

  const client = getTableClient();

  if (req.method === 'GET') {
    try {
      const entity = await client.getEntity<ProfileEntity>(user.userId, 'profile');
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityToProfile(entity)),
      };
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 404) {
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultProfile(user.userId)),
        };
        return;
      }
      context.log.error('getProfile failed', err);
      context.res = { status: 500, body: 'Failed to load profile' };
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const update = req.body as Partial<UserProfile>;

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
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      };
    } catch (err) {
      context.log.error('putProfile failed', err);
      context.res = { status: 500, body: 'Failed to save profile' };
    }
    return;
  }

  context.res = { status: 405 };
};

export default httpTrigger;
