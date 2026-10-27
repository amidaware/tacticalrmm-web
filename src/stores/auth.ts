import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

import axios from "axios";
import { completePasskeyLogin } from "@/api/webauthn";

interface CheckCredentialsRequest {
  username: string;
  password: string;
}

interface LoginRequest {
  username: string;
  password: string;
  twofactor: string;
}

interface CheckCredentialsResponse {
  token?: string;
  username?: string;
  name?: string | null;
  totp?: boolean;
  passkey?: boolean;
}

interface TOTPSetupResponse {
  qr_url: string;
  totp_key: string;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    username: useStorage("user_name", null),
    name: useStorage("name", null),
    token: useStorage("access_token", null),
    ssoLoginProvider: useStorage("sso_provider", null),
    provider_id: useStorage("provider_id", null),
    next: useStorage("next", null),
    passkeyEnrollmentPrompt: false,
  }),
  getters: {
    loggedIn: (state) => {
      return state.token !== null;
    },
    displayName: (state) => {
      return state.name ? state.name : state.username;
    },
  },
  actions: {
    async checkCredentials(
      credentials: CheckCredentialsRequest,
    ): Promise<CheckCredentialsResponse> {
      const { data } = await axios.post("/v2/checkcreds/", credentials);

      if (!data.totp && !data.passkey) {
        this.token = data.token;
        this.username = data.username;
        this.name = data.name;
      }
      return data;
    },
    async login(credentials: LoginRequest) {
      const { data } = await axios.post("/v2/login/", credentials);
      this.username = data.username;
      this.name = data.name;
      this.token = data.token;
      this.ssoLoginProvider = null;

      return data;
    },
    async loginWithPasskey(credential: Record<string, unknown>) {
      const data = await completePasskeyLogin(credential);
      this.username = data.username;
      this.name = data.name;
      this.token = data.token;
      this.ssoLoginProvider = null;

      return data;
    },
    requestPasskeyEnrollmentPrompt() {
      this.passkeyEnrollmentPrompt = true;
    },
    consumePasskeyEnrollmentPrompt() {
      const shouldPrompt = this.passkeyEnrollmentPrompt;
      this.passkeyEnrollmentPrompt = false;
      return shouldPrompt;
    },
    async logout() {
      if (this.token !== null) {
        try {
          await axios.post("/logout/");
        } catch {}
      }
      this.token = null;
      this.username = null;
      this.name = null;
      this.ssoLoginProvider = null;
      this.provider_id = null;
      this.passkeyEnrollmentPrompt = false;
    },
    async setupTotp(): Promise<TOTPSetupResponse | false> {
      const { data } = await axios.post("/accounts/users/setup_totp/");
      return data;
    },
  },
});
