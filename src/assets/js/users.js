async function loadUsers() {
  const rows = document.querySelector("#user-table");
  if (!rows) return;
  try {
    const response = await fetch("/api/users");
    const users = await response.json();
    rows.innerHTML = users.map(
      (user) => `<tr><td>${user.id}</td><td>${user.name}</td><td>${user.email}</td></tr>`
    ).join("");
  } catch (error) {
    rows.innerHTML = '<tr><td colspan="3">Failed to load users.</td></tr>';
  }
}
loadUsers();
