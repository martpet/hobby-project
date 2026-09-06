import { deleteAccount } from "passkeys";

const form = document.getElementById("delete-account-form");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  deleteAccount(form);
});
