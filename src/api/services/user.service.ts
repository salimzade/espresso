export interface User {
  id: number;
  name: string;
  email: string;
}

export type UserInput = Pick<User, 'name' | 'email'>;

const store: User[] = [
  { id: 1, name: 'Alice', email: 'alice@espresso.dev' },
  { id: 2, name: 'Bob', email: 'bob@espresso.dev' },
];

let nextId = 3;

export const userService = {
  list(): User[] {
    return store;
  },

  find(id: number): User | undefined {
    return store.find((user) => user.id === id);
  },

  create(input: UserInput): User {
    const user: User = { id: nextId++, ...input };
    store.push(user);
    return user;
  },

  update(id: number, input: Partial<UserInput>): User | undefined {
    const user = this.find(id);
    if (!user) return undefined;
    Object.assign(user, input);
    return user;
  },

  remove(id: number): User | undefined {
    const index = store.findIndex((user) => user.id === id);
    if (index === -1) return undefined;
    return store.splice(index, 1)[0];
  },
};