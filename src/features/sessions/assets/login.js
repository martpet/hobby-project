import { apiFetch, toggleButtonLoading } from "util";

const loginButtons = document.getElementsByClassName("login-button");

for (const button of loginButtons) {
  button.addEventListener("click", handleButtonClick);
}

async function handleButtonClick({ target }) {
  toggleButtonLoading(target);

  const handleError = createErrorHandler(target);

  try {
    const start = await apiFetch("/login/start", {
      method: "POST",
    });

    if (!start.ok) {
      handleError(start.error);
      return;
    }

    const { startAuthentication } = await import("simplewebauthn");

    const authResponseJson = await startAuthentication({
      optionsJSON: start.value,
    });

    const finish = await apiFetch("/login/finish", {
      method: "POST",
      json: authResponseJson,
    });

    if (!finish.ok) {
      handleError(finish.error);
      return;
    }

    location.reload();
  } catch (error) {
    handleError(error);
    console.log(error);
  }
}

function createErrorHandler(button) {
  return (error) => {
    toggleButtonLoading(button);

    let msg;
    if (error === "PasskeyNotFound") {
      msg = "This passkey is no longer valid";
    } else if (error === "AccountDeleted") {
      msg = "This account has been deleted";
    } else if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return;
      } else if (!navigator.onLine) {
        msg = "Network is offline";
      }
    }

    alert(msg || "Something went wrong");
  };
}
