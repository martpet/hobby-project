import { authenticateWithPasskey, showAlert, toggleButtonLoading } from "util";

// Same handler for the public "Sign In" button and the "Reauthenticate" one
// in the session-expiry banner; the server decides which it is.
const loginButtons = document.getElementsByClassName("login-button");

for (const button of loginButtons) {
  button.addEventListener("click", handleButtonClick);
}

async function handleButtonClick({ currentTarget }) {
  setLoginButtonsBusy(true, currentTarget);

  try {
    const loginFinish = await authenticateWithPasskey();

    if (!loginFinish.ok) {
      handleFailure(loginFinish);
      return;
    }

    // Reload (not navigate): the current URL is fine, it just needs to be
    // re-rendered as the logged-in user. See signup-form.js for why reload
    // rather than `location.assign` matters on WebKit.
    location.reload();
  } catch (error) {
    handleFailure(error);
  }
}

function setLoginButtonsBusy(force, loadingButton) {
  for (const button of loginButtons) {
    toggleButtonLoading(button, force && button === loadingButton);
    button.toggleAttribute("disabled", force);
  }
}

function handleFailure(failure) {
  setLoginButtonsBusy(false);

  let msg;
  if (failure instanceof Error) {
    // The user dismissed the passkey prompt; not an error worth showing.
    if (failure.name === "NotAllowedError") {
      return;
    }
    console.error(failure);
    if (!navigator.onLine) {
      msg = "Network is offline";
    }
  } else {
    // Server-provided, human-readable explanation (RFC 9457 `detail`).
    msg = failure.detail;
  }

  showAlert(msg || "Something went wrong");
}
