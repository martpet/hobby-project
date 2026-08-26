export function DeleteAccountButton() {
  return (
    <>
      <button
        command="show-modal"
        commandfor="delete-account-dialog"
        class="small danger"
      >
        Delete Your Account
      </button>

      <dialog
        id="delete-account-dialog"
        class="basic"
      >
        <h2>Delete Account</h2>
        <p>This cannot be undone.</p>

        <div class="actions">
          <form
            method="POST"
            action="/account/delete"
          >
            <button
              type="submit"
              class="danger-solid"
            >
              Delete Account Forever
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
