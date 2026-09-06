import { Context } from "@shared/context.ts";
import { dateTimeFormat, relativeTime } from "@shared/intl.ts";
import { decodeTime } from "@std/ulid";
import { Passkey } from "../types.ts";
import { PasskeyActions } from "./PasskeyActions.tsx";

interface PasskeysTableProps {
  passkeys: Passkey[];
}

export function PasskeysTable({ passkeys }: PasskeysTableProps, c: Context) {
  c.head.modules.add("passkey-actions");

  const dateWithTimeFmt = dateTimeFormat(c);
  const now = Date.now();
  // The last passkey is the only way into the account, so its delete control
  // is hidden; the server refuses it too, in case of a forged request.
  const canDelete = passkeys.length > 1;

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Last used</th>
            <th></th>
          </tr>
        </thead>

        {passkeys.map((passkey) => (
          <tr>
            <td>{passkey.name}</td>
            <td>{dateWithTimeFmt.format(decodeTime(passkey.id))}</td>
            <td>{relativeTime(c, passkey.lastUsedAt - now)}</td>
            <td>
              <PasskeyActions passkey={passkey} canDelete={canDelete} />
            </td>
          </tr>
        ))}
      </table>

      <p>
        <button id="add-passkey-button">Add a passkey</button>
      </p>
    </>
  );
}
