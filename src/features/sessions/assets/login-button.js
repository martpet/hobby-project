import { apiFetch, showAlert, toggleButtonLoading } from "util";

const loginButtons = document.getElementsByClassName("login-button");

for (const button of loginButtons) {
  button.addEventListener("click", handleButtonClick);
}

async function handleButtonClick({ target }) {
  toggleButtonLoading(target);

  const handleError = createErrorHandler(target);

  try {
    const [loginStart, { startAuthentication, sendSignal }] = await Promise.all(
      [apiFetch("/login/start", { method: "POST" }), import("simplewebauthn")],
    );

    if (!loginStart.ok) {
      handleError(loginStart.error);
      return;
    }

    const authResponseJson = await startAuthentication({
      optionsJSON: loginStart.value,
    });

    const loginFinish = await apiFetch("/login/finish", {
      method: "POST",
      json: authResponseJson,
    });

    if (!loginFinish.ok) {
      if (isUnknownCredentialError(loginFinish.error)) {
        trySendSignal(sendSignal, {
          signalName: "unknownCredential",
          rpID: loginStart.value.rpId,
          credentialID: authResponseJson.id,
        });
      }
      handleError(loginFinish.error);
      return;
    }

    if (loginFinish.value?.signal) {
      await trySendSignal(sendSignal, loginFinish.value.signal);
    }

    location.reload();
  } catch (error) {
    handleError(error);
    console.log(error);
  }
}

function isUnknownCredentialError(error) {
  return error === "PasskeyNotFound" || error === "AccountDeleted";
}

// Signals are fire-and-forget and unsupported in some browsers
async function trySendSignal(sendSignal, opts) {
  try {
    await sendSignal(opts);
  } catch (error) {
    console.debug(error);
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

    showAlert(msg || "Something went wrong");
  };
}
