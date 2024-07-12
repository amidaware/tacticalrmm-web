import { Notify } from "quasar";

export function isValidThreshold(
  warning: number,
  error: number,
  diskcheck = false,
) {
  if (warning === 0 && error === 0) {
    Notify.create({
      type: "negative",
      timeout: 2000,
      message: "Warning Threshold or Error Threshold need to be set",
    });
    return false;
  }

  if (!diskcheck && warning > error && warning > 0 && error > 0) {
    Notify.create({
      type: "negative",
      timeout: 2000,
      message: "Warning Threshold must be less than Error Threshold",
    });
    return false;
  }

  if (diskcheck && warning < error && warning > 0 && error > 0) {
    Notify.create({
      type: "negative",
      timeout: 2000,
      message: "Warning Threshold must be more than Error Threshold",
    });
    return false;
  }

  return true;
}

export function validateEventID(val: number | "*") {
  if (val === null || val.toString().replace(/\s/g, "") === "") {
    return false;
  } else if (val === "*") {
    return true;
  } else if (!isNaN(val)) {
    return true;
  } else {
    return false;
  }
}

// validate script return code
// function is used for quasar's q-select on-new-value function
export function validateRetcode(
  val: string,
  done: (item?: unknown, mode?: "add" | "add-unique" | "toggle") => void,
) {
  /^\d+$/.test(val) ? done(val) : done();
}

export function validateTimePeriod(val: string) {
  return /^\d{1,3}(H|h|M|m|S|s|d|D)$/.test(val);
}

export function isValidEmail(val: string) {
  const email =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/;
  return email.test(val);
}
