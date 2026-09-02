import { Context } from "@shared/context.ts";
import { CloseButton } from "@shared/jsx/CloseButton.tsx";
import { FLASH } from "../const.ts";

const FLASH_DIALOG = "flash";

export function FlashMessage(_props: unknown, c: Context) {
  if (!c.flash) return;

  const flash = FLASH[c.flash];

  return (
    <dialog
      open
      id={FLASH_DIALOG}
      class={`alert ${flash.type}`}
    >
      {flash.msg}
      <CloseButton
        commandfor={FLASH_DIALOG}
        command="close"
      />
    </dialog>
  );
}
