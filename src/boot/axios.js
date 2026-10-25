import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import { Notify } from "quasar";

export const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return window._env_.PROD_URL;
  } else {
    return process.env.DEV_API;
  }
};

export function setErrorMessage(data, message) {
  console.log(data);
  return [
    () => {
      message;
    },
  ];
}

function isRequestCanceled(error) {
  if (!error) return false;
  if (typeof axios.isCancel === "function" && axios.isCancel(error)) {
    return true;
  }
  return (
    error.code === "ERR_CANCELED" ||
    error.name === "CanceledError" ||
    error.name === "AbortError"
  );
}

function rejectAxios(error) {
  if (error?.config?.skipGlobalErrorNotify) {
    return Promise.reject(error);
  }
  return Promise.reject({ ...error });
}

export default function ({ app, router }) {
  app.config.globalProperties.$axios = axios;
  axios.defaults.withCredentials = true;

  axios.interceptors.request.use(
    function (config) {
      const auth = useAuthStore();
      config.baseURL = getBaseUrl();
      const token = auth.token;
      if (token != null) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    },
    function (err) {
      return Promise.reject(err);
    },
  );

  axios.interceptors.response.use(
    function (response) {
      return response;
    },
    async function (error) {
      if (isRequestCanceled(error)) {
        return rejectAxios(error);
      }

      const status = error.response?.status;

      if (error.config?.skipGlobalErrorNotify) {
        if (status === 401) {
          router.push({ path: "/expired" });
        }
        return Promise.reject(error);
      }

      if (error.code && error.code === "ERR_NETWORK") {
        Notify.create({
          color: "negative",
          message: "Backend is offline (network error)",
          caption:
            "Open your browser's dev tools and check the console tab for more detailed error messages",
          timeout: 5000,
        });
        return rejectAxios(error);
      }

      let text;

      if (!error.response) {
        text = error.message;
      } else if (status === 401) {
        router.push({ path: "/expired" });
      } else if (status === 403) {
        // don't notify user if method is GET
        if (
          error.config.method === "get" ||
          error.config.method === "patch" ||
          error.config.url === "accounts/ssoproviders/token/"
        )
          return rejectAxios(error);
        text = error.response.data.detail;
      } else if (status >= 400 && status < 500 && status !== 423) {
        if (error.config.responseType === "blob") {
          text = (await error.response.data.text()).replace(/^"|"$/g, "");
        } else if (error.response.data.non_field_errors) {
          text = error.response.data.non_field_errors[0];
        } else {
          if (typeof error.response.data === "string") {
            text = error.response.data;
          } else if (typeof error.response.data === "object") {
            let [key, value] = Object.entries(error.response.data)[0];

            if (Array.isArray(value)) {
              text = key + ": " + value[0];
            } else {
              text = key + ": " + value;
            }
          }
        }
      }

      if ((text || error.response) && status !== 423) {
        Notify.create({
          color: "negative",
          message: text ? text : "",
          caption: error.response
            ? `${status}: ${error.response.statusText}`
            : "",
          timeout: 2500,
        });
      }

      return rejectAxios(error);
    },
  );
}
