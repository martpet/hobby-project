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
    if (accountDelete.code === "REAUTH_REQUIRED") {
      const reauth = await authenticateWithPasskey();

      if (!reauth.ok) {
        handleFailure(reauth);
        return;
      }

      accountDelete = await apiFetch(form.action, { method: "POST" });
    }

    if (!accountDelete.ok) {
      handleFailure(accountDelete);
      return;
    }

    // Sequential on purpose: browsers may serialise credential-manager calls,
    // and each one is best-effort anyway (see trySendWebAuthnSignal).
    for (const signal of accountDelete.value.signals) {
      await trySendWebAuthnSignal(signal);
    }

    location.assign("/");
  } catch (error) {
    handleFailure(error);
  }
}

function handleFailure(failure) {
  // Session vanished mid-flow (revoked elsewhere, expired, or never existed);
  // reloading shows the logged-out page with whatever flash the server set.
  // A plain HTTP status check rather than a `code`, since it's a generic
  // "not authenticated" outcome rather than a domain-specific one.
  if (failure.status === 401) {
    location.reload();
    return;
  }

  toggleFormBuisy(form);

  let msg;
  if (failure instanceof Error) {
    // The user dismissed the passkey prompt; not an error worth showing.
    if (failure.name === "NotAllowedError") {
      return;
    }
    console.error(failure);
    if (!navigator.onLine) {
      msg = "Network is offline";
    }
  } else {
    // Server-provided, human-readable explanation (RFC 9457 `detail`).
    msg = failure.detail;
  }

  showAlert(msg || "Something went wrong");
}
