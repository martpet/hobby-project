export async function apiFetch(path, opts = {}) {
  let { method, body, json, headers = {} } = opts;
  headers = new Headers(headers);

  if (json) {
    body = JSON.stringify(json);
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { method, body, headers });
  const resContType = res.headers.get("content-type");
  const isResJson = resContType?.includes("application/json");
  const result = { ok: res.ok };

  if (isResJson) {
    const data = await res.json();
    result.value = data;
    if (!res.ok || data.error) {
      result.error = data.error;
    }
  } else {
    const data = await res.text();
    if (!res.ok) {
      result.error = data;
    } else {
      result.value = data;
    }
  }
  return result;
}

export function toggleButtonLoading(button, force) {
  button.toggleAttribute("disabled", force);
  button.classList.toggle("loading", force);
}

export function toggleFormBuisy(form, force) {
  for (const element of form.elements) {
    if (element.type === "submit") {
      toggleButtonLoading(element, force);
    } else {
      element.toggleAttribute("disabled", force);
    }
  }
}

export function showAlert(msg, type = "danger") {
  const dialog = document.createElement("dialog");
  dialog.id = `alert-${crypto.randomUUID()}`;
  dialog.className = `alert ${type}`;
  dialog.textContent = msg;

  const closeButton = document.createElement("button");
  closeButton.className = "close";
  closeButton.textContent = "x";
  closeButton.commandForElement = dialog;
  closeButton.command = "close";
  dialog.append(closeButton);

  (document.getElementById("alerts") ?? document.body).append(dialog);
  // showModal (not show) so the alert enters the top layer, rendering
  // above any already-open modal dialog rather than behind it.
  dialog.showModal();
}

// WebAuthn signals are fire-and-forget and unsupported in some browsers, so
// a failure is never surfaced to the user.
export async function trySendWebAuthnSignal(opts) {
  try {
    const { sendSignal } = await import("simplewebauthn");
    await sendSignal(opts);
  } catch (error) {
    console.debug(error);
  }
}

// Runs a passkey authentication ceremony against the login endpoints. When
// already authenticated, the server treats this as a reauth and refreshes
// the session. May reject (e.g. NotAllowedError if the user cancels).
export async function authenticateWithPasskey() {
  const [loginStart, { startAuthentication }] = await Promise.all([
    apiFetch("/login/start", { method: "POST" }),
    import("simplewebauthn"),
  ]);

  if (!loginStart.ok) {
    return loginStart;
  }

  const authResponseJson = await startAuthentication({
    optionsJSON: loginStart.value,
  });

  const loginFinish = await apiFetch("/login/finish", {
    method: "POST",
    json: authResponseJson,
  });

  // Present on both outcomes: unknownCredential on a rejected passkey,
  // allAcceptedCredentials after a successful login.
  if (loginFinish.value?.signal) {
    await trySendWebAuthnSignal(loginFinish.value.signal);
  }

  return loginFinish;
}
