import { apiFetch, toggleFormBuisy } from "util";

const form = document.getElementById("signup-form");

form.addEventListener("submit", handleFormSubmit);
form.username.addEventListener("input", handleUsernameInput);

async function handleFormSubmit(event) {
  event.preventDefault();
  toggleFormBuisy(form);

  const username = form.username.value;
  const handleError = createErrorHandler(username);

  try {
    const start = await apiFetch("/signup/start", {
      method: "POST",
      json: { username },
    });

    if (!start.ok) {
      handleError(start.error);
      return;
    }

    const { startRegistration } =
      await import("/passkeys/assets/simplewebauthn.js");

    const regResponseJson = await startRegistration({
      optionsJSON: start.value,
    });

    const finish = await apiFetch("/signup/finish", {
      method: "POST",
      json: regResponseJson,
    });

    if (!finish.ok) {
      handleError(finish.error);
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

function createErrorHandler(username) {
  return (error) => {
    toggleFormBuisy(form);

    if (error === "UsernameTaken") {
      form.username.setCustomValidity(`Sorry, username "${username}" is taken`);
      form.username.reportValidity();
      return;
    }

    let msg;
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return;
      } else if (!navigator.onLine) {
        msg = "Network is offline";
      }
    }

    alert(msg || "Something went wrong");
  };
}
