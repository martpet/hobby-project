// Shared between `installer.ts` (compiled and run as root on the Pi) and
// `set-secret.ts` (run locally to provision/rotate a secret). Both are
// compiled/run as standalone Deno programs, so this module is bundled into
// each rather than read at a shared path.
//
// Secret values themselves never live in a repository env file or in any
// plaintext file on the Pi. Each is encrypted at rest with `systemd-creds`,
// using a key that exists only on that machine, so the ciphertext under
// `SECRET_STORE_DIR` is useless without root access to that specific host.

export interface SecretDef {
  readonly name: string;
  readonly label: string;
}

export const SECRET_STORE_DIR = "/etc/hobproj/credstore.encrypted";

export const SECRETS: readonly SecretDef[] = [
  { name: "cloudflare_tunnel_token", label: "Cloudflare Tunnel token" },
  { name: "cloudflare_zone_id", label: "Cloudflare Zone ID" },
  { name: "cloudflare_api_token", label: "Cloudflare API token" },
  { name: "geoip_account_id", label: "MaxMind GeoIP account ID" },
  { name: "geoip_license_key", label: "MaxMind GeoIP license key" },
];

export function isSecretName(name: string): boolean {
  return SECRETS.some((secret) => secret.name === name);
}

export function credentialPath(name: string): string {
  return `${SECRET_STORE_DIR}/${name}.cred`;
}
