<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex bg-image flex-center">
        <q-card
          v-bind:style="$q.screen.lt.sm ? { width: '80%' } : { width: '30%' }"
        >
          <q-card-section>
            <div class="text-center q-pt-lg">
              <div class="col text-h4 ellipsis">Tactical RMM</div>
            </div>
          </q-card-section>
          <q-card-section>
            <q-form ref="form" @submit.prevent="checkCreds" class="q-gutter-md">
              <q-input
                filled
                v-model="credentials.username"
                label="Username"
                autocomplete="username"
                lazy-rules
                :rules="[
                  (val) => (val && val.length > 0) || 'This field is required',
                ]"
              />
              <q-input
                v-model="credentials.password"
                filled
                :type="showPassword ? 'password' : 'text'"
                label="Password"
                autocomplete="current-password"
                lazy-rules
                :rules="[
                  (val) => (val && val.length > 0) || 'This field is required',
                ]"
              >
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
              <div>
                <q-btn
                  label="Login"
                  type="submit"
                  color="primary"
                  class="full-width"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section v-if="ssoProviders?.length > 0">
            <div class="text-h6 text-center q-mb-md">Log in with SSO</div>
            <q-separator />

            <q-list dense bordered class="q-pa-sm">
              <q-item
                v-for="provider in ssoProviders"
                :key="provider.id"
                @click="openSSOProviderRedirect(provider.id)"
                clickable
                class="q-pa-xs hover-bg"
              >
                <q-item-section avatar>
                  <q-icon
                    :name="provider.icon ?? 'mdi-key'"
                    size="sm"
                    class="text-primary"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ provider.name }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- 2 factor modal -->
        <q-dialog persistent v-model="prompt">
          <q-card style="min-width: 400px">
            <q-form ref="formToken" @submit.prevent="onSubmit">
              <q-card-section class="text-center text-h6"
                >Two-Factor Token</q-card-section
              >

              <q-card-section>
                <q-input
                  autofocus
                  outlined
                  autocomplete="one-time-code"
                  v-model="twofactor"
                  inputmode="numeric"
                  :rules="[
                    (val) =>
                      (val && val.length > 0) || 'This field is required',
                  ]"
                />
              </q-card-section>

              <q-card-actions align="right" class="text-primary">
                <q-btn flat label="Cancel" v-close-popup />
                <q-btn
                  v-if="hasPasskey"
                  flat
                  label="Use Passkey"
                  type="button"
                  @click="onPasskeySubmit"
                />
                <q-btn flat label="Submit" type="submit" />
              </q-card-actions>
            </q-form>
          </q-card>
        </q-dialog>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { type QForm, useQuasar } from "quasar";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import {
  beginPasskeyLogin,
  credentialToJSON,
  getPasskeyAssertion,
} from "@/api/webauthn";
import { notifyError } from "@/utils/notify";
import {
  openSSOProviderRedirect,
  getSSOConfig,
  type SSOProviderConfig,
} from "@/ee/sso/api/sso";

// setup quasar
const $q = useQuasar();
$q.dark.set(true);

// setup auth store
const auth = useAuthStore();

// setup router
const router = useRouter();

const form = ref<QForm | null>(null);
const formToken = ref<QForm | null>(null);

// login logic
const credentials = reactive({ username: "", password: "" });
const twofactor = ref("");
const prompt = ref(false);
const hasTotp = ref(false);
const hasPasskey = ref(false);
const showPassword = ref(true);
const ssoProviders = ref([] as SSOProviderConfig[]);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function checkCreds() {
  try {
    const { totp, passkey } = await auth.checkCredentials(credentials);
    hasTotp.value = !!totp;
    hasPasskey.value = !!passkey;

    if (passkey) {
      await onPasskeySubmit();
    } else if (totp) {
      twofactor.value = "";
      prompt.value = true;
    } else {
      router.push({ name: "TOTPSetup" });
    }
  } catch (err) {
    notifyError(errorMessage(err, "Login failed"), 3500);
  }
}

async function routeAfterLogin() {
  if (auth.next) {
    router.push(auth.next);
    auth.next = null;
  } else {
    router.push({ name: "Dashboard" });
  }
}

async function onPasskeySubmit() {
  prompt.value = false;
  $q.loading.show();
  try {
    const options = await beginPasskeyLogin();
    const credential = await getPasskeyAssertion(options);
    await auth.loginWithPasskey(credentialToJSON(credential));
    form.value?.reset();
    formToken.value?.reset();
    await routeAfterLogin();
  } catch (err) {
    if (hasTotp.value) {
      twofactor.value = "";
      prompt.value = true;
    } else {
      const message =
        err instanceof Error ? err.message : "Passkey verification failed";
      notifyError(message, 3500);
    }
  } finally {
    $q.loading.hide();
  }
}

async function onSubmit() {
  try {
    await auth.login({ ...credentials, twofactor: twofactor.value });
    if (!hasPasskey.value) {
      auth.requestPasskeyEnrollmentPrompt();
    }
    await routeAfterLogin();
  } catch (err) {
    notifyError(errorMessage(err, "Login failed"), 3500);
  } finally {
    form.value?.reset();
    formToken.value?.reset();
    prompt.value = false;
  }
}

onMounted(async () => {
  try {
    const result = await getSSOConfig();
    ssoProviders.value = result.data.socialaccount.providers;
  } catch {
    ssoProviders.value = [];
  }
});
</script>

<style>
.bg-image {
  background-image: linear-gradient(
    90deg,
    rgba(20, 20, 29, 1) 0%,
    rgba(38, 42, 56, 1) 49%,
    rgba(15, 18, 20, 1) 100%
  );
}
</style>
