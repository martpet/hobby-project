export function setButtonLoading(button, flag = true) {
  button.disabled = flag;
  button.classList.toggle("loading", flag);
}

export function showAlert(message) {
  const template = document.createElement("template");
  template.innerHTML = `
    <dialog class="basic">
      <p>${escapeHtml(message)}</p>
      <div class="actions">
        <button>OK</button>
      </div>
    </dialog>
  `;

  const dialog = template.content.firstElementChild;
  dialog
    .querySelector("button")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove());

  document.body.append(dialog);
  dialog.showModal();
}

// prevent `message` from being interpreted as markup when inlined into the template above
function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

export function setFormLoading(form, flag = true) {
  for (const formEl of form.elements) formEl.disabled = flag;
  const button = form.querySelector("button[type=submit]");
  button?.classList.toggle("loading", flag);
}

export async function apiFetch(path, options = {}) {
  let { method, body, json, headers = {} } = options;
  headers = new Headers(headers);
  if (json) {
    body = JSON.stringify(json);
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { method, body, headers });
  const resContentType = res.headers.get("content-type");
  const isJsonRes = resContentType?.includes("application/json");
  const result = { ok: res.ok };
  if (isJsonRes) {
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
