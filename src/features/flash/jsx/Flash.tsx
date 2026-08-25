import { Context } from "@etc/types.ts";
import { FLASH } from "../const.ts";

export function Flash(_props: unknown, c: Context) {
  if (!c.flash) return;

  const flash = FLASH[c.flash];

  return (
    <dialog
      open
      id="flash"
      class={`alert ${flash.type}`}
    >
      {flash.msg}
      <button
        title="Close"
        commandfor="flash"
        command="close"
        class="close"
      >
        ×
      </button>
    </dialog>
  );
}
