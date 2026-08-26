export function DeleteAccountButton() {
  return (
    <>
      <button
        command="show-modal"
        commandfor="delete-account-dialog"
        class="small"
      >
        Delete your account
      </button>

      <dialog
        id="delete-account-dialog"
        class="basic"
      >
        <h2>Delete account</h2>
        <p>This cannot be undone.</p>

        <div class="actions">
          <form
            method="POST"
            action="/account/delete"
          >
            <button
              type="submit"
              class="danger"
            >
              Delete account
            </button>
          </form>
          <button
            command="close"
            commandfor="delete-account-dialog"
            autofocus
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
