import { User } from "@features/users/types.ts";

export const DELETE_ACCOUNT_DIALOG_ID = "delete-account-dialog";
export const DELETE_ACCOUNT_FORM_ID = "delete-account-form";

interface DeleteAccountDialogProps {
  user: User;
}

export function DeleteAccountDialog({ user }: DeleteAccountDialogProps) {
  return (
    <dialog id={DELETE_ACCOUNT_DIALOG_ID}>
      <h2>Delete account?</h2>
      <p>This action cannot be undone.</p>

      <form
        id={DELETE_ACCOUNT_FORM_ID}
        method="POST"
        action="/account/delete"
      >
        <label for="username">Username:</label>
        <input
          id="username"
          type="text"
          pattern={RegExp.escape(user.username)}
          title={`Type "${user.username}"`}
          autocomplete="off"
          required
        />
      </form>

      <footer class="actions">
        <button
          command="close"
          commandfor={DELETE_ACCOUNT_DIALOG_ID}
          autofocus
        >
          Cancel
        </button>
        <button
          form={DELETE_ACCOUNT_FORM_ID}
          class="danger"
        >
          Delete Account Forever
        </button>
      </footer>
    </dialog>
  );
}
