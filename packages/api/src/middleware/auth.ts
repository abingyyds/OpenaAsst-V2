import type { Context, Next } from 'hono';
import { supabase } from '../lib/supabase.js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const userIdHeader = c.req.header('X-User-Id');

  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
      }
    } catch {
      // Token invalid, continue as anonymous
    }
  }

  if (!userId && userIdHeader) {
    userId = userIdHeader;
  }

  c.set('userId', userId);
  await next();
}
