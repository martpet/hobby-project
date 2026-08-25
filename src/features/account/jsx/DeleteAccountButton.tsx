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
        <h2>Delete your account</h2>
        <p>Are you sure you want to delete your account?</p>
        <p>This cannot be undone.</p>

        <div class="actions">
          <button
            command="close"
            commandfor="delete-account-dialog"
          >
            Cancel
          </button>
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
        </div>
      </dialog>
    </>
  );
}
