// Thin `fetch` wrapper normalising every response into
// `{ ok, status, value?, code?, detail? }` so callers can branch on `status`
// for generic HTTP-level outcomes (e.g. 401), on `code` for domain-specific
// ones (e.g. "USERNAME_TAKEN"), and show `detail` (if present) as a
// ready-made, human-readable message — without caring whether the server
// sent JSON or a plain-text body. Network failures still reject like
// `fetch` does.
export async function apiFetch(path, opts = {}) {
  let { method, body, json, headers = {} } = opts;
  headers = new Headers(headers);

  if (json) {
    body = JSON.stringify(json);
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { method, body, headers });
  const resContType = res.headers.get("content-type");
  const isProblemJson = resContType?.includes("application/problem+json");
  const isResJson = isProblemJson || resContType?.includes("application/json");
  const result = { ok: res.ok, status: res.status };

  // Errors are served as Problem Details (RFC 9457, see respondForbidden and
  // friends): `code` is the machine-readable extension member to branch on,
  // `detail` is the human-readable explanation to display as-is (RFC 9457
  // §3.1 — never parse `detail` for information). The whole object still
  // goes on `value` because the extra data (e.g. a WebAuthn signal) is
  // useful even on failure.
  if (isResJson) {
    const data = await res.json();
    result.value = data;
    if (isProblemJson) {
      result.code = data.code;
      result.detail = data.detail;
    }
  } else {
    const data = await res.text();
    if (!res.ok) {
      // No structured Problem Details available (e.g. an infra-level error
      // page); the raw text is the best-effort message.
      result.detail = data;
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

// Disables the whole form during a request. Submit buttons get the spinner;
// other fields are merely disabled. `force` works like `classList.toggle`.
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
