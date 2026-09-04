import {
  CredentialDeviceType,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

export interface Passkey {
  id: string;
  userId: string;
  webauthnUserId: string;
  credId: string;
  credPublicKey: Uint8Array;
  counter: number;
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  transports?: string[];
}

export interface PasskeyRegOptions {
  cookie: string;
  value: PublicKeyCredentialCreationOptionsJSON;
  expiresAt: number;
}

export interface PasskeyAuthOptions {
  cookie: string;
  value: PublicKeyCredentialRequestOptionsJSON;
  expiresAt: number;
}
