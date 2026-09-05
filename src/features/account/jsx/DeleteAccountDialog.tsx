import { User } from "@features/users/types.ts";
import { Context } from "@shared/context.ts";

export const DELETE_ACCOUNT_DIALOG = "delete-account-dialog";
const DELETE_ACCOUNT_FORM = "delete-account-form";

interface DeleteAccountDialogProps {
  user: User;
}

export function DeleteAccountDialog(
  { user }: DeleteAccountDialogProps,
  c: Context,
) {
  c.head.modules.add("delete-account-form");
  c.head.modulepreloads.add("util");
  c.head.importmap.add("util");
  c.head.importmap.add("simplewebauthn");

  // `command`/`commandfor` (Invoker Commands API) open/close the dialog with
  // no script; the same applies to `DeleteAccountButton`.
  return (
    <dialog id={DELETE_ACCOUNT_DIALOG}>
      <h2>Delete account?</h2>
      <p>This action cannot be undone.</p>

      <form
        id={DELETE_ACCOUNT_FORM}
        method="POST"
        action="/account/delete"
      >
        <label for="username">Username:</label>
        {/* Type-to-confirm guard via HTML validation only; not sent to server. */}
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
          commandfor={DELETE_ACCOUNT_DIALOG}
          autofocus
        >
          Cancel
        </button>
        {/* Outside the form so it can share the footer; linked via `form=`. */}
        <button
          form={DELETE_ACCOUNT_FORM}
          class="danger"
        >
          Delete Account Forever
        </button>
      </footer>
    </dialog>
  );
}
