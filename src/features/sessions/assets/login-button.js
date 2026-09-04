import {
  apiFetch,
  showAlert,
  toggleButtonLoading,
  trySendWebAuthnSignal,
} from "util";

const loginButtons = document.getElementsByClassName("login-button");

for (const button of loginButtons) {
  button.addEventListener("click", handleButtonClick);
}

async function handleButtonClick({ target }) {
  toggleButtonLoading(target);

  const handleError = createErrorHandler(target);

  try {
    const [loginStart, { startAuthentication }] = await Promise.all([
      apiFetch("/login/start", { method: "POST" }),
      import("simplewebauthn"),
    ]);

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
        trySendWebAuthnSignal({
          signalName: "unknownCredential",
          rpID: loginStart.value.rpId,
          credentialID: authResponseJson.id,
        });
      }
      handleError(loginFinish.error);
      return;
    }

    if (loginFinish.value?.signal) {
      await trySendWebAuthnSignal(loginFinish.value.signal);
    }

    location.reload();
  } catch (error) {
    handleError(error);
  }
}

function isUnknownCredentialError(error) {
  return error === "PasskeyNotFound" || error === "AccountDeleted";
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
      }
      console.error(error);
      if (!navigator.onLine) {
        msg = "Network is offline";
      }
    }

    showAlert(msg || "Something went wrong");
  };
}
