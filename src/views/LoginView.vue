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
                :label="t('auth.login.username')"
                lazy-rules
                :rules="[
                  (val) =>
                    (val && val.length > 0) || t('auth.validation.required'),
                ]"
              />
              <q-input
                v-model="credentials.password"
                filled
                :type="showPassword ? 'password' : 'text'"
                :label="t('auth.login.password')"
                lazy-rules
                :rules="[
                  (val) =>
                    (val && val.length > 0) || t('auth.validation.required'),
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
                  :label="t('auth.login.submit')"
                  type="submit"
                  color="primary"
                  class="full-width"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section v-if="ssoProviders?.length > 0">
            <div class="text-h6 text-center q-mb-md">
              {{ t("auth.login.ssoTitle") }}
            </div>
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
              <q-card-section class="text-center text-h6">{{
                t("auth.login.twoFactorToken")
              }}</q-card-section>

              <q-card-section>
                <q-input
                  autofocus
                  outlined
                  autocomplete="one-time-code"
                  v-model="twofactor"
                  :rules="[
                    (val) =>
                      (val && val.length > 0) || t('auth.validation.required'),
                  ]"
                />
              </q-card-section>

              <q-card-actions align="right" class="text-primary">
                <q-btn flat :label="t('common.buttons.cancel')" v-close-popup />
                <q-btn flat :label="t('common.actions.submit')" type="submit" />
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
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
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
const { t } = useI18n();

const form = ref<QForm | null>(null);
const formToken = ref<QForm | null>(null);

// login logic
const credentials = reactive({ username: "", password: "" });
const twofactor = ref("");
const prompt = ref(false);
const showPassword = ref(true);
const ssoProviders = ref([] as SSOProviderConfig[]);

async function checkCreds() {
  try {
    const { totp } = await auth.checkCredentials(credentials);

    if (!totp) {
      router.push({ name: "TOTPSetup" });
    } else {
      twofactor.value = "";
      prompt.value = true;
    }
  } catch (err) {
    console.error(err);
  }
}

async function onSubmit() {
  try {
    await auth.login({ ...credentials, twofactor: twofactor.value });
    if (auth.next) {
      router.push(auth.next);
      auth.next = null;
    } else {
      router.push({ name: "Dashboard" });
    }
  } catch (err) {
    console.error(err);
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
  } catch (e) {
    console.error(e);
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
