import { CloseButton } from "@etc/jsx/CloseButton.tsx";
import { Context } from "@etc/types.ts";
import { FLASH } from "../const.ts";

export function FlashDialog(_props: unknown, c: Context) {
  if (!c.flash) return;

  const flash = FLASH[c.flash];

  return (
    <dialog
      open
      id="flash"
      class={`alert ${flash.type}`}
    >
      {flash.msg}
      <CloseButton
        commandfor="flash"
        command="close"
      />
    </dialog>
  );
}
