import { boot } from "quasar/wrappers";

export default boot(() => {
  try {
    const saved = localStorage.getItem("uiModern");
    // default ON unless explicitly disabled
    const enabled = saved !== "off";
    document.body.classList.toggle("ui-modern", enabled);
    // expose simple toggle for debugging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).setUIModern = (on: boolean) => {
      document.body.classList.toggle("ui-modern", on);
      localStorage.setItem("uiModern", on ? "on" : "off");
    };
  } catch {
    document.body.classList.add("ui-modern");
  }
});


