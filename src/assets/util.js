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
    if (!res.ok || data.error) {
      result.error = data.error;
    } else {
      result.value = data;
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

export function showAlert(msg, type = "error") {
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

  document.body.append(dialog);
  dialog.show();
}
