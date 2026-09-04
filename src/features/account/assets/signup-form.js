import { apiFetch, showAlert, toggleFormBuisy } from "util";

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

    // Reload rather than navigate to "/": the server redirects an
    // authenticated /signup there anyway, and a reload skips WebKit's disk
    // cache, which may otherwise serve the anonymous "/" stored before signup.
    // Same root cause as https://bugs.webkit.org/show_bug.cgi?id=323342 (see
    // cacheNoStoreOnCookieChange in shared/cache-control.ts): WebKit's
    // `Vary: Cookie` check reads the cookie jar instead of the request's
    // Cookie header, and the jar can lag behind the Set-Cookie just received.
    location.reload();
  } catch (error) {
    handleError(error);
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
      }
      console.error(error);
      if (!navigator.onLine) {
        msg = "Network is offline";
      }
    }

    showAlert(msg || "Something went wrong");
  };
}
