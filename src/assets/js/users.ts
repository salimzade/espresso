interface User {
  id: number;
  name: string;
  email: string;
}

async function loadUsers(): Promise<void> {
  const rows = document.querySelector<HTMLTableSectionElement>('#user-table');
  if (!rows) return;
  try {
    const response = await fetch('/api/users');
    const users: User[] = await response.json();
    rows.innerHTML = users
      .map(
        (user) => `<tr><td>${user.id}</td><td>${user.name}</td><td>${user.email}</td></tr>`,
      )
      .join('');
  } catch (error) {
    rows.innerHTML = '<tr><td colspan="3">Failed to load users.</td></tr>';
  }
}

loadUsers();