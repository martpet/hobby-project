import { Context } from "@etc/types.ts";
import { FLASH } from "../const.ts";

export function FlashDialog(_props: unknown, c: Context) {
  if (!c.flash) return;

  const flash = FLASH[c.flash];

  return (
    <dialog open id="flash-dialog">
      {flash.msg}
      <footer class="actions">
        <button commandfor="flash-dialog" command="close">
          Close
        </button>
      </footer>
    </dialog>
  );
}
