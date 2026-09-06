import { Passkey } from "../types.ts";

export const renameDialogId = (id: string) => `rename-passkey-dialog-${id}`;

interface RenamePasskeyDialogProps {
  passkey: Passkey;
}

export function RenamePasskeyDialog({ passkey }: RenamePasskeyDialogProps) {
  const dialogId = renameDialogId(passkey.id);
  const formId = `rename-passkey-form-${passkey.id}`;
  const inputId = `rename-passkey-name-${passkey.id}`;

  return (
    <dialog id={dialogId}>
      <h2>Rename passkey</h2>

      <form
        id={formId}
        method="POST"
        action={`/passkeys/${passkey.id}/rename`}
      >
        <label for={inputId}>Name:</label>
        <input
          id={inputId}
          name="name"
          type="text"
          value={passkey.name}
          maxlength={50}
          autocomplete="off"
          required
          autofocus
        />
      </form>

      <footer class="actions">
        <button command="close" commandfor={dialogId} autofocus>
          Cancel
        </button>
        {/* Outside the form so it can share the footer; linked via `form=`. */}
        <button form={formId}>
          Save
        </button>
      </footer>
    </dialog>
  );
}
