import { loginWithPasskey } from "passkeys";

const loginButtons = document.getElementsByClassName("login-button");

for (const button of loginButtons) {
  button.addEventListener("click", () => loginWithPasskey(loginButtons, button));
}
