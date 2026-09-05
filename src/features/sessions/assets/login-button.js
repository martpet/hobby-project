import { authenticateWithPasskey, showAlert, toggleButtonLoading } from "util";

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
