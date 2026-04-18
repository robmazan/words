import type { HttpRequest } from '@azure/functions';

export interface Principal {
  userId: string;
  userDetails: string;
  identityProvider: string;
}

export function getUserFromRequest(req: HttpRequest): Principal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as Principal;
  } catch {
    return null;
  }
}
