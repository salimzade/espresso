import { logger as createLogger, type Middleware } from '../../core/index.ts';

/** Beautiful request logger. Customize with `createLogger({ ... })`. */
export const logger: Middleware = createLogger({ timestamp: 'time', showQuery: true, showSize: true });

export { createLogger };

/** Only lets requests through when the query has `?admin=true`. */
export const requireAdmin: Middleware = async (ctx) => {
  if (ctx.query.get('admin') !== 'true') {
    return ctx.json({ error: 'Forbidden' }, 403);
  }
};

/** Adds a custom header to every response. */
export const poweredBy: Middleware = async (ctx, next) => {
  const response = await next();
  if (response instanceof Response) {
    response.headers.set('x-powered-by', 'espresso');
  }
  return response;
};