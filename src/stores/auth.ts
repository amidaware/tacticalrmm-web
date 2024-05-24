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
    token: useStorage("access_token", null),
  }),
  getters: {
    loggedIn: (state) => {
      return state.token !== null;
    },
  },
  actions: {
    async checkCredentials(
      credentials: CheckCredentialsRequest,
    ): Promise<CheckCredentialsResponse> {
      const { data } = await axios.post("/checkcreds/", credentials);

      if (!data.totp) {
        this.token = data.token;
        this.username = data.username;
      }
      return data;
    },
    async login(credentials: LoginRequest) {
      const { data } = await axios.post("/login/", credentials);
      this.username = data.username;
      this.token = data.token;

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
    },
    async setupTotp(): Promise<TOTPSetupResponse | false> {
      const { data } = await axios.post("/accounts/users/setup_totp/");
      return data;
    },
  },
});
