export function SignOutButton() {
  return (
    <form method="POST" action="/signout">
      <button type="submit">Sign out</button>
    </form>
  );
}
