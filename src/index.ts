import { Espresso } from './core/index.ts';
import { logger, poweredBy, userRoute, userService } from './api/index.ts';

const app = new Espresso();

app
  .use(logger)
  .use('/api', poweredBy)

  .mount('/api/users', userRoute)
  .get('/api/health', () => ({ status: 'ok', uptime: process.uptime() }))

  .get('/', ({ view }) => view('index', {
    title: 'espresso',
    description: 'A pragmatic, lightweight Node.js web framework',
    tagline: 'Express-like routing, Elysia-like context, fully typed.',
  }))
  .get('/users', ({ view }) => view('users', { title: 'Users', users: userService.list() }))

  .assets('/assets')
  .public('/');

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`☕ espresso running at http://localhost:${port}`);
});