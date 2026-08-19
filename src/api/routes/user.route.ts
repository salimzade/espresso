import { router } from '../../core/index.ts';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from '../controllers/user.controller.ts';

export const userRoute = router()
  .get('/', listUsers)
  .get('/:id', getUser)
  .post('/', createUser)
  .patch('/:id', updateUser)
  .put('/:id', updateUser)
  .delete('/:id', deleteUser);