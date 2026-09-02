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
    const [signupStart, { startRegistration }] = await Promise.all([
      apiFetch("/signup/start", { method: "POST", json: { username } }),
      import("simplewebauthn"),
    ]);

    if (!signupStart.ok) {
      handleError(signupStart.error);
      return;
    }

    const regResponseJson = await startRegistration({
      optionsJSON: signupStart.value,
    });

    const signupFinish = await apiFetch("/signup/finish", {
      method: "POST",
      json: regResponseJson,
    });

    if (!signupFinish.ok) {
      handleError(signupFinish.error);
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
