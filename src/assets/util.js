export function setButtonLoading(button, flag = true) {
  button.disabled = flag;
  button.classList.toggle("loading", flag);
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
