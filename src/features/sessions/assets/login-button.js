import { authenticateWithPasskey, showAlert, toggleButtonLoading } from "util";

// Same handler for the public "Sign In" button and the "Reauthenticate" one
// in the session-expiry banner; the server decides which it is.
const loginButtons = document.getElementsByClassName("login-button");

for (const button of loginButtons) {
  button.addEventListener("click", handleButtonClick);
}

async function handleButtonClick({ target }) {
  toggleButtonLoading(target);

  const handleError = createErrorHandler(target);

  try {
    const loginFinish = await authenticateWithPasskey();

    if (!loginFinish.ok) {
      handleError(loginFinish.error);
      return;
    }

    // Reload (not navigate): the current URL is fine, it just needs to be
    // re-rendered as the logged-in user. See signup-form.js for why reload
    // rather than `location.assign` matters on WebKit.
    location.reload();
  } catch (error) {
    handleError(error);
  }
}

function createErrorHandler(button) {
  return (error) => {
    toggleButtonLoading(button);

    let msg;
    if (error === "PasskeyNotFound") {
      msg = "This passkey is no longer valid";
    } else if (error === "AccountDeleted") {
      msg =
        "Your account has been deleted. You can delete the passkey from the authenticator.";
    } else if (error === "PasskeyAccountMismatch") {
      msg = "That passkey belongs to a different account.";
    } else if (error instanceof Error) {
      // The user dismissed the passkey prompt; not an error worth showing.
      if (error.name === "NotAllowedError") {
        return;
      }
      console.error(error);
      if (!navigator.onLine) {
        msg = "Network is offline";
      }
    }

    showAlert(msg || "Something went wrong");
  };
}
