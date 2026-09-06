import { Passkey } from "../types.ts";

export const deleteDialogId = (id: string) => `delete-passkey-dialog-${id}`;

interface DeletePasskeyDialogProps {
  passkey: Passkey;
}

export function DeletePasskeyDialog({ passkey }: DeletePasskeyDialogProps) {
  const dialogId = deleteDialogId(passkey.id);
  const formId = `delete-passkey-form-${passkey.id}`;

  return (
    <dialog id={dialogId}>
      <h2>Delete passkey?</h2>
      <p>You will no longer be able to sign in with "{passkey.name}".</p>

      {
        /* The class lets passkey-actions.js enhance the native post with the
          WebAuthn signal that drops the key from the credential manager. */
      }
      <form
        id={formId}
        class="delete-passkey-form"
        method="POST"
        action={`/passkeys/${passkey.id}/delete`}
      >
      </form>

      <footer class="actions">
        <button command="close" commandfor={dialogId} autofocus>
          Cancel
        </button>
        <button form={formId} class="danger">
          Delete Passkey
        </button>
      </footer>
    </dialog>
  );
}
