import axios from "axios";

const baseUrl = "/accounts";

export type PasskeyAttachment = "platform" | "cross-platform";

export interface Passkey {
  id: number;
  nickname: string | null;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
  device_id: string | null;
}

type CredentialJSON = Record<string, unknown>;

function base64urlToArrayBuffer(value: string): ArrayBuffer {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function arrayBufferToBase64url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeRequestOptions(
  options: PublicKeyCredentialRequestOptions & {
    challenge: string;
    allowCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }>;
  },
): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: base64urlToArrayBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map((credential) => ({
      ...credential,
      id: base64urlToArrayBuffer(credential.id),
    })),
  };
}

function decodeCreationOptions(
  options: PublicKeyCredentialCreationOptions & {
    challenge: string;
    user: PublicKeyCredentialUserEntity & { id: string };
    excludeCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }>;
  },
): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: base64urlToArrayBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64urlToArrayBuffer(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map((credential) => ({
      ...credential,
      id: base64urlToArrayBuffer(credential.id),
    })),
  };
}

export function credentialToJSON(
  credential: PublicKeyCredential,
): CredentialJSON {
  const response = credential.response;
  const body: CredentialJSON = {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
  };

  if (credential.authenticatorAttachment) {
    body.authenticatorAttachment = credential.authenticatorAttachment;
  }

  if (response instanceof AuthenticatorAttestationResponse) {
    body.response = {
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
    };
  } else if (response instanceof AuthenticatorAssertionResponse) {
    body.response = {
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle
        ? arrayBufferToBase64url(response.userHandle)
        : null,
    };
  }

  return body;
}

export function credentialTransports(
  credential: PublicKeyCredential,
): string[] {
  const response = credential.response;

  if (
    response instanceof AuthenticatorAttestationResponse &&
    typeof response.getTransports === "function"
  ) {
    return response.getTransports();
  }

  return [];
}

export function isWebAuthnSupported() {
  return !!window.PublicKeyCredential && !!navigator.credentials;
}

function assertWebAuthnSupported() {
  if (!isWebAuthnSupported()) {
    throw new Error("Passkeys are not supported by this browser.");
  }
}

export async function beginPasskeyLogin() {
  const { data } = await axios.post(`${baseUrl}/webauthn/login/begin/`);
  return data;
}

export async function getPasskeyAssertion(
  options: PublicKeyCredentialRequestOptions & { challenge: string },
): Promise<PublicKeyCredential> {
  assertWebAuthnSupported();
  const credential = await navigator.credentials.get({
    publicKey: decodeRequestOptions(options),
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Passkey verification was cancelled.");
  }

  return credential;
}

export async function completePasskeyLogin(credential: CredentialJSON) {
  const { data } = await axios.post(`${baseUrl}/webauthn/login/complete/`, {
    credential,
  });
  return data;
}

export async function fetchPasskeys(): Promise<Passkey[]> {
  const { data } = await axios.get(`${baseUrl}/passkeys/`);
  return data;
}

export async function beginPasskeyRegistration(attachment?: PasskeyAttachment) {
  const { data } = await axios.post(`${baseUrl}/webauthn/register/begin/`, {
    attachment,
  });
  return data;
}

export async function createPasskeyCredential(
  options: PublicKeyCredentialCreationOptions & { challenge: string },
): Promise<PublicKeyCredential> {
  assertWebAuthnSupported();
  const credential = await navigator.credentials.create({
    publicKey: decodeCreationOptions(options),
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Passkey registration was cancelled.");
  }

  return credential;
}

export async function completePasskeyRegistration(
  credential: CredentialJSON,
  nickname: string | null,
  transports: string[],
) {
  const { data } = await axios.post(`${baseUrl}/webauthn/register/complete/`, {
    credential,
    nickname,
    transports,
  });
  return data;
}

export async function renamePasskey(id: number, nickname: string | null) {
  const { data } = await axios.post(`${baseUrl}/passkeys/${id}/rename/`, {
    nickname,
  });
  return data;
}

export async function deletePasskey(id: number) {
  const { data } = await axios.post(`${baseUrl}/passkeys/${id}/delete/`);
  return data;
}

export async function fetchUserPasskeys(userId: number): Promise<Passkey[]> {
  const { data } = await axios.get(`${baseUrl}/users/${userId}/passkeys/`);
  return data;
}

export async function resetUserPasskeys(userId: number) {
  const { data } = await axios.delete(`${baseUrl}/users/${userId}/passkeys/`);
  return data;
}
