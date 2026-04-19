export interface SwaUser {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

let cachedUser: SwaUser | null | undefined = undefined;

export async function getCurrentUser(): Promise<SwaUser | null> {
  if (cachedUser !== undefined) return cachedUser;
  try {
    const res = await fetch('/.auth/me');
    const data = await res.json() as { clientPrincipal: SwaUser | null };
    cachedUser = data.clientPrincipal ?? null;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

export function clearUserCache(): void {
  cachedUser = undefined;
}

export function getLoginUrl(): string {
  // return '/.auth/login/microsoft?post_login_redirect_uri=/';
  return '/.auth/login/aad?post_login_redirect_uri=/';
}

export function getLogoutUrl(): string {
  return '/.auth/logout?post_logout_redirect_uri=/login';
}
