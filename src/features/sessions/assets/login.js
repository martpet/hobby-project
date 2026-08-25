import { apiFetch, setButtonLoading } from "/assets/util.js";
import { startAuthentication } from "/passkeys/assets/simplewebauthn.js";

const logInButtons = document.querySelectorAll("button.login");

for (const button of logInButtons) {
  button.addEventListener("click", handleClick);
}

async function handleClick({ target: button }) {
  setButtonLoading(button);

  const handleError = makeErrorHandler(button);

  try {
    const start = await apiFetch("/login/start", {
      method: "POST",
    });

    if (!start.ok) {
      handleError(start.error);
      return;
    }

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
