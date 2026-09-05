import {
  apiFetch,
  authenticateWithPasskey,
  showAlert,
  toggleFormBuisy,
  trySendWebAuthnSignal,
} from "util";

const form = document.getElementById("delete-account-form");

form.addEventListener("submit", handleFormSubmit);

async function handleFormSubmit(event) {
  event.preventDefault();
  toggleFormBuisy(form);

  try {
    let accountDelete = await apiFetch(form.action, { method: "POST" });

    // The server refuses unless the passkey ceremony was recent. Reauth
    // replaces the session (same cookie name), then the delete is retried
    // transparently — the user only sees the passkey prompt.
    if (accountDelete.error === "ReauthRequired") {
      const reauth = await authenticateWithPasskey();

      if (!reauth.ok) {
        handleError(reauth.error);
        return;
      }

      accountDelete = await apiFetch(form.action, { method: "POST" });
    }

    if (!accountDelete.ok) {
      handleError(accountDelete.error);
      return;
    }

    // Sequential on purpose: browsers may serialise credential-manager calls,
    // and each one is best-effort anyway (see trySendWebAuthnSignal).
    for (const signal of accountDelete.value.signals) {
      await trySendWebAuthnSignal(signal);
    }

    location.assign("/");
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  // Session vanished mid-flow (revoked elsewhere, expired); reloading shows
  // the logged-out page with whatever flash the server set.
  if (error === "Unauthorized") {
    location.reload();
    return;
  }

  toggleFormBuisy(form);

  let msg;
  if (error === "PasskeyAccountMismatch") {
    msg = "That passkey belongs to a different account.";
  } else if (error instanceof Error) {
    // The user dismissed the passkey prompt; not an error worth showing.
    if (error.name === "NotAllowedError") {
      return;
    }
    console.error(error);
    if (!navigator.onLine) {
      msg = "Network is offline";
    }
  }

  showAlert(msg || "Something went wrong");
}
