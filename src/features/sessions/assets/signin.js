import { apiFetch, setButtonLoading } from "/assets/util.js";
import { startAuthentication } from "/passkeys/assets/simplewebauthn.js";

const signInButtons = document.querySelectorAll("button.signin");

for (const button of signInButtons) {
  button.addEventListener("click", handleClick);
}

async function handleClick({ target: button }) {
  setButtonLoading(button);

  const handleError = makeErrorHandler(button);

  try {
    const startResult = await apiFetch("/signin/start", {
      method: "POST",
    });

    if (!startResult.ok) {
      handleError(startResult.error);
      return;
    }

    const authResponse = await startAuthentication({
      optionsJSON: startResult.value,
    });

    const finishResult = await apiFetch("/signin/finish", {
      method: "POST",
      json: { authResponse },
    });

    if (!finishResult.ok) {
      handleError(finishResult.error);
      return;
    }

    location.reload();
  } catch (error) {
    handleError(error);
    console.log(error);
  }
}

function makeErrorHandler(button) {
  return (error) => {
    setButtonLoading(button, false);

    let userMsg;

    if (error === "PasskeyNotFound") {
      userMsg = "This passkey is no longer available on the website";
    } else if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return;
      } else if (!navigator.onLine) {
        userMsg = "Network is offline";
      }
    }

    alert(userMsg || "Something went wrong");
  };
}
