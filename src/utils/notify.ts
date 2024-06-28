import { Notify } from "quasar";

export function notifySuccess(msg: string, timeout = 2000) {
  Notify.create({
    type: "positive",
    message: msg,
    timeout: timeout,
  });
}

export function notifyError(msg: string, timeout = 2000) {
  Notify.create({
    type: "negative",
    message: msg,
    timeout: timeout,
  });
}

export function notifyWarning(msg: string, timeout = 2000) {
  Notify.create({
    type: "warning",
    message: msg,
    timeout: timeout,
  });
}

export function notifyInfo(msg: string, timeout = 2000) {
  Notify.create({
    type: "info",
    message: msg,
    timeout: timeout,
  });
}
