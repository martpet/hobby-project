interface DeleteAccountButtonProps {
  username: string;
}

export function DeleteAccountDialog({ username }: DeleteAccountButtonProps) {
  return (
    <>
      <button
        command="show-modal"
        commandfor="delete-account-dialog"
      >
        Delete Your Account
      </button>

      <dialog id="delete-account-dialog">
        <h2>Delete account?</h2>
        <p>This action cannot be undone.</p>

        <form id="delete-account-form" method="POST" action="/account/delete">
          <label for="username">Username:</label>
          <input
            id="username"
            type="text"
            pattern={username}
            required
          />
        </form>

        <footer class="actions">
          <button
            command="close"
            commandfor="delete-account-dialog"
            autofocus
          >
            Cancel
          </button>
          <button form="delete-account-form" class="danger">
            Delete Account Forever
          </button>
        </footer>
      </dialog>
    </>
  );
}
