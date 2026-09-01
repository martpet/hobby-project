import { CloseButton } from "@shared/jsx/CloseButton.tsx";
import { Context } from "@shared/types.ts";
import { FLASH } from "../const.ts";

export function FlashMessage(_props: unknown, c: Context) {
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
