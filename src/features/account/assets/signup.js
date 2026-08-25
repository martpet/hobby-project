import { apiFetch, setFormLoading, showAlert } from "/assets/util.js";
import { startRegistration } from "/passkeys/assets/simplewebauthn.js";

const form = document.getElementById("signup-form");

form.addEventListener("submit", handleFormSubmit);
form.username.addEventListener("input", handleUsernameInput);

async function handleFormSubmit(event) {
  event.preventDefault();
  setFormLoading(form);

  const username = form.username.value;

  try {
    const start = await apiFetch("/signup/start", {
      method: "POST",
      json: { username },
    });

    if (!start.ok) {
      handleError(start.error, username);
      return;
    }

    const regResponseJson = await startRegistration({
      optionsJSON: start.value,
    });

    const finish = await apiFetch("/signup/finish", {
      method: "POST",
      json: regResponseJson,
    });

    if (!finish.ok) {
      handleError(finish.error, username);
      return;
    }

    location.assign("/");
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

  showAlert(userMsg || "Something went wrong");
}
