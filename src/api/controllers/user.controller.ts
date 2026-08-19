import type { Handler } from '../../core/index.ts';
import { userService, type UserInput } from '../services/user.service.ts';

const notFound = (ctx: { json: (data: unknown, status?: number) => Response }) =>
  ctx.json({ error: 'User not found' }, 404);

export const listUsers: Handler<'/'> = ({ json }) => json(userService.list());

export const getUser: Handler<'/:id'> = ({ params, json }) => {
  const user = userService.find(Number(params.id));
  return user ? json(user) : json({ error: 'User not found' }, 404);
};

export const createUser: Handler<'/'> = async ({ body, json }) => {
  const input = (await body) as UserInput;
  if (!input || typeof input.name !== 'string' || typeof input.email !== 'string') {
    return json({ error: 'name and email are required' }, 400);
  }
  return json(userService.create(input), 201);
};

export const updateUser: Handler<'/:id'> = async ({ params, body, json }) => {
  const input = (await body) as Partial<UserInput>;
  const user = userService.update(Number(params.id), input ?? {});
  return user ? json(user) : notFound({ json });
};

export const deleteUser: Handler<'/:id'> = ({ params, json }) => {
  const user = userService.remove(Number(params.id));
  return user ? json({ deleted: user.id }) : notFound({ json });
};