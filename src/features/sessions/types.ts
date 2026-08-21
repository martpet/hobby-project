import { Alert } from "@/shared/types.ts";
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { UserAgent } from "@std/http";
import { SetRequiredDeep } from "type-fest";

export interface Session {
  id: string;
  expiresAt: number;
  data: {
    alerts?: Alert[];
    login?: {
      userId: string;
      date: Date;
      browser: UserAgent["browser"]["name"];
      os: UserAgent["os"]["name"];
      ip: string;
    };
    passkeyRegOptions?: {
      value: PublicKeyCredentialCreationOptionsJSON;
      expiresAt: number;
    };
    passkeyAuthOptions?: {
      value: PublicKeyCredentialRequestOptionsJSON;
      expiresAt: number;
    };
  };
}

export type LoginSession = SetRequiredDeep<Session, "data.login">;
