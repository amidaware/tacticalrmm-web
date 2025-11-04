<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <template v-if="!$branding">
    Custom branding feature requires a Tier 2 or higher sponsorship. Please
    check the docs for more info.
  </template>
  <template v-else>
    <q-card flat>
      <div style="max-height: 50vh" class="scroll">
        <q-card-section class="row">
          <div class="col-4">Company Name</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.company_name" class="col-6" />
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Primary Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.primary_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.primary_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Secondary Color:</div>
          <div class="col-2"></div>
          <q-input
            filled
            dense
            v-model="branding.secondary_color"
            class="col-6"
          >
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.secondary_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Accent Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.accent_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.accent_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Dark Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.dark_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.dark_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Dark Page Color:</div>
          <div class="col-2"></div>
          <q-input
            filled
            dense
            v-model="branding.dark_page_color"
            class="col-6"
          >
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.dark_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Positive Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.positive_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.positive_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Negative Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.negative_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.negative_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Info Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.info_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.info_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Warning Color:</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.warning_color" class="col-6">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <q-color v-model="branding.warning_color" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-4">Favicon:</div>
          <div class="col-2"></div>
          <q-file
            class="col-6"
            v-model="localFavicon"
            filled
            :label="
              branding.favicon
                ? 'Favicon set'
                : 'Click to select favicon (png, ico, svg)'
            "
            accept=".svg, .png, .ico"
            @update:model-value="fileChanged"
            clearable
            dense
          >
            <template v-slot:append>
              <q-btn
                v-if="branding.favicon && !localFavicon"
                icon="cancel"
                flat
                round
                dense
                @click.stop.prevent="clearFavicon"
              >
                <q-tooltip>Clear favicon</q-tooltip>
              </q-btn>
            </template>
            <template v-slot:after>
              <q-img
                v-if="branding.favicon !== null"
                :src="branding.favicon"
                height="32px"
                width="32px"
                class="q-mx-sm cursor-pointer"
                @click="showFaviconModal = true"
              >
                <q-tooltip>Click to view</q-tooltip>
              </q-img>
            </template>
          </q-file>
        </q-card-section>
      </div>
      <q-card-actions align="right">
        <q-btn label="Save" color="primary" @click="submit" />
      </q-card-actions>
      <q-inner-loading :showing="isLoading">
        <q-spinner color="primary" size="3em" />
      </q-inner-loading>
    </q-card>

    <!-- Favicon preview modal -->
    <q-dialog v-model="showFaviconModal">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md flex flex-center">
          <q-img
            :src="branding.favicon"
            fit="contain"
            style="max-width: 300px; max-height: 300px"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </template>
</template>

<script lang="ts" setup>
import { ref, onMounted, getCurrentInstance, computed } from "vue";
import { brandingStore } from "../api";

const localFavicon = ref<File | null>(null);
const showFaviconModal = ref(false);

const { branding, isLoading } = brandingStore;

const instance = getCurrentInstance();
const $branding = computed(() => {
  return instance?.appContext.config.globalProperties.$branding || null;
});

// setup stores
async function submit() {
  try {
    await brandingStore.saveBranding(branding.value);
  } catch {
    // do nothing
  }
}

async function fileChanged(file: File | null) {
  if (!file) {
    branding.value.favicon = "";
    return;
  }
  branding.value.favicon = await fileToDataUrl(file);
}

function clearFavicon() {
  branding.value.favicon = "";
  localFavicon.value = null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

onMounted(() => {
  brandingStore.getBranding();
});
</script>
