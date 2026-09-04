import {
  apiFetch,
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
    const accountDelete = await apiFetch(form.action, { method: "POST" });

    if (!accountDelete.ok) {
      handleError(accountDelete.error);
      return;
    }

    for (const signal of accountDelete.value.signals) {
      await trySendWebAuthnSignal(signal);
    }

    location.assign("/");
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (error === "Unauthorized") {
    location.reload();
    return;
  }

  toggleFormBuisy(form);

  let msg;
  if (error instanceof Error) {
    console.error(error);
    if (!navigator.onLine) {
      msg = "Network is offline";
    }
  }

  showAlert(msg || "Something went wrong");
}
