import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

import axios from "axios";

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
  token: string;
  username: string;
  totp?: boolean;
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

      if (!data.totp) {
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
    },
    async setupTotp(): Promise<TOTPSetupResponse | false> {
      const { data } = await axios.post("/accounts/users/setup_totp/");
      return data;
    },
  },
});
