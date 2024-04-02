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

export const useAuthStore = defineStore("auth", {
  state: () => ({
    username: useStorage("username", null),
    token: useStorage("token", null),
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
  },
});
