<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex bg-image flex-center">
        <q-card
          v-bind:style="$q.screen.lt.sm ? { width: '80%' } : { width: '30%' }"
        >
          <q-card-section>
            <div class="row justify-end">
              <q-select
                v-model="language"
                :options="languageOptions"
                map-options
                emit-value
                dense
                borderless
                options-dense
                style="min-width: 160px"
                @update:model-value="changeLanguage"
              >
                <template #prepend><q-icon name="translate" /></template>
              </q-select>
            </div>
            <div class="text-center q-pt-lg">
              <div class="col text-h4 ellipsis">Tactical RMM</div>
            </div>
          </q-card-section>
          <q-card-section>
            <q-form ref="form" @submit.prevent="checkCreds" class="q-gutter-md">
              <q-input
                filled
                v-model="credentials.username"
                :label="$t('login.username')"
                autocomplete="username"
                lazy-rules
                :rules="[requiredRule]"
              />
              <q-input
                v-model="credentials.password"
                filled
                :type="showPassword ? 'password' : 'text'"
                :label="$t('login.password')"
                autocomplete="current-password"
                lazy-rules
                :rules="[requiredRule]"
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
                  :label="$t('login.login')"
                  type="submit"
                  color="primary"
                  class="full-width"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section v-if="ssoProviders?.length > 0">
            <div class="text-h6 text-center q-mb-md">
              {{ $t("login.sso") }}
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
                $t("login.twoFactor")
              }}</q-card-section>

              <q-card-section>
                <q-input
                  autofocus
                  outlined
                  autocomplete="one-time-code"
                  v-model="twofactor"
                  inputmode="numeric"
                  :rules="[requiredRule]"
                />
              </q-card-section>

              <q-card-actions align="right" class="text-primary">
                <q-btn flat :label="$t('common.cancel')" v-close-popup />
                <q-btn flat :label="$t('common.submit')" type="submit" />
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
import { useI18n } from "vue-i18n";
import axios from "axios";
import { SUPPORTED_LOCALES, getLocale, setLocale } from "@/i18n";
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

// language (saved to the user's profile after login)
const { t } = useI18n();
const language = ref(getLocale());
const languageChanged = ref(false);
const languageOptions = SUPPORTED_LOCALES.map((l) => ({
  label: l.label,
  value: l.value,
}));

async function changeLanguage(value: string) {
  languageChanged.value = true;
  await setLocale(value);
}

function requiredRule(val: string) {
  return (val && val.length > 0) || t("login.required");
}

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
    if (languageChanged.value) {
      try {
        await axios.patch("/accounts/users/ui/", { language: language.value });
      } catch (e) {
        console.error(e);
      }
    }
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
