import { apiFetch, setFormLoading } from "/assets/util.js";
import { startRegistration } from "/passkeys/assets/simplewebauthn.js";

const form = document.getElementById("signup-form");

form.addEventListener("submit", handleFormSubmit);
form.username.addEventListener("input", handleUsernameInput);

async function handleFormSubmit(event) {
  event.preventDefault();
  setFormLoading(form);

  const username = form.username.value;

  try {
    const startResult = await apiFetch("/signup/start", {
      method: "POST",
      json: { username },
    });

    if (!startResult.ok) {
      handleError(startResult.error, username);
      return;
    }

    const regResponse = await startRegistration({
      optionsJSON: startResult.value,
    });

    const finishResult = await apiFetch("/signup/finish", {
      method: "POST",
      json: { regResponse },
    });

    if (!finishResult.ok) {
      handleError(finishResult.error, username);
      return;
    }

    location.assign("/account");
  } catch (error) {
    handleError(error);
    console.log(error);
  }
}

function handleUsernameInput() {
  form.username.setCustomValidity("");
}

function handleError(error, username) {
  setFormLoading(form, false);

  if (error === "UsernameTaken") {
    form.username.setCustomValidity(`Sorry, username "${username}" is taken`);
    form.username.reportValidity();
    return;
  }

  let userMsg;

  if (error instanceof Error) {
    if (error.name === "NotAllowedError") {
      return;
    } else if (!navigator.onLine) {
      userMsg = "Network is offline";
    }
  }

  alert(userMsg || "Something went wrong");
}
