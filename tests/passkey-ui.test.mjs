import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { parse } from "@vue/compiler-sfc";

function descriptor(path) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return parse(source, { filename: path }).descriptor;
}

function template(path) {
  return descriptor(path).template?.content ?? "";
}

function script(path) {
  const sfc = descriptor(path);
  return `${sfc.script?.content ?? ""}\n${sfc.scriptSetup?.content ?? ""}`;
}

function style(path) {
  return descriptor(path)
    .styles.map((entry) => entry.content)
    .join("\n");
}

test("preferences passkey enrollment actions are explicit and ordered", () => {
  const tpl = template("src/components/accounts/PasskeyManager.vue");
  const js = script("src/components/accounts/PasskeyManager.vue");

  assert.equal(tpl.includes(["More", "Options"].join(" ")), false);
  assert.match(tpl, /<q-btn-dropdown[\s\S]*label="Other"/);
  assert.match(tpl, /<q-item-section>Browser Choice<\/q-item-section>/);
  assert.match(tpl, /<q-item-section>Security Key<\/q-item-section>/);
  assert.match(tpl, /label="Phone"/);
  assert.match(tpl, /label="This Device"/);

  const otherIndex = tpl.indexOf('label="Other"');
  const phoneIndex = tpl.indexOf('label="Phone"');
  const deviceIndex = tpl.indexOf('label="This Device"');
  assert.ok(otherIndex < phoneIndex);
  assert.ok(phoneIndex < deviceIndex);

  assert.match(js, /label:\s*"Passkey name"/);
  assert.match(js, /ok:\s*\{\s*label:\s*"Continue"\s*\}/);
  assert.match(js, /defaultName:\s*"This device"/);
  assert.match(js, /beginPasskeyRegistration\(option\.attachment\)/);
});

test("passkey transport chips use rounded rectangle styling", () => {
  for (const path of [
    "src/components/accounts/PasskeyManager.vue",
    "src/components/accounts/UserPasskeysTable.vue",
  ]) {
    const tpl = template(path);
    const css = style(path);

    assert.match(tpl, /<q-chip[\s\S]*square[\s\S]*class="passkey-chip"/);
    assert.match(css, /\.passkey-chip\s*\{[\s\S]*border-radius:\s*6px;/);
  }
});

test("user administration MFA markers stay compact", () => {
  const tpl = template("src/components/AdminManager.vue");
  const css = style("src/components/AdminManager.vue");

  assert.match(tpl, /class="mfa-chip"[\s\S]*>TOTP/);
  assert.match(tpl, /class="mfa-chip"[\s\S]*icon-right="vpn_key"/);
  assert.equal(tpl.includes("passkey_last_used_at"), false);
  assert.match(css, /\.mfa-chip\s*\{[\s\S]*border-radius:\s*6px;/);
});

test("user menu passkey shortcut puts the key icon on the right", () => {
  const tpl = template("src/layouts/MainLayout.vue");
  const labelIndex = tpl.indexOf("<q-item-label>Passkeys</q-item-label>");
  const iconIndex = tpl.indexOf("<q-item-section side>", labelIndex);
  const nextAccountIndex = tpl.indexOf("<q-item clickable>", labelIndex + 1);

  assert.ok(labelIndex > -1);
  assert.ok(iconIndex > labelIndex);
  assert.ok(nextAccountIndex === -1 || iconIndex < nextAccountIndex);
});

test("login and preferences expose passkey-first fallback surfaces", () => {
  const loginTpl = template("src/views/LoginView.vue");
  const loginJs = script("src/views/LoginView.vue");
  const preferencesTpl = template(
    "src/components/modals/coresettings/UserPreferences.vue",
  );

  assert.match(loginTpl, /label="Use Passkey"/);
  assert.match(loginJs, /if \(passkey\) \{\s*await onPasskeySubmit\(\);/);
  assert.match(loginJs, /if \(hasTotp\.value\) \{[\s\S]*prompt\.value = true;/);
  assert.match(loginJs, /auth\.requestPasskeyEnrollmentPrompt\(\)/);
  assert.match(preferencesTpl, /<q-tab name="security" label="Security"/);
  assert.match(preferencesTpl, /<PasskeyManager \/>/);
});
