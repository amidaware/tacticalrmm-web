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
      <q-card-section class="row">
        <div class="col-4">Company Name</div>
        <div class="col-2"></div>
        <q-input filled dense v-model="branding.company_name" class="col-6" />
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
      <div class="row items-center q-mb-md">
        <div class="col">
          <div class="text-h6">Theme Builder</div>
        </div>
        <div class="col-auto">
          <q-btn-toggle
            v-model="viewMode"
            toggle-color="primary"
            :options="[
              { label: 'Builder', value: 'builder' },
              { label: 'Preview', value: 'preview' },
            ]"
            dense
          />
        </div>
      </div>
      <div v-if="viewMode === 'builder'">
        <q-card-section>
          <div class="text-subtitle2 q-mb-md">Color Palette</div>

          <!-- Color Grid -->
          <div class="row q-gutter-md">
            <div
              v-for="colorDef in colorDefinitions"
              :key="colorDef.key"
              class="col-12 col-sm-6 col-md-4"
            >
              <q-card flat bordered>
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-gutter-sm">
                    <div
                      class="color-preview"
                      :style="{
                        backgroundColor:
                          (branding[colorDef.key] as string) ||
                          colorDef.default,
                      }"
                    ></div>
                    <div class="col">
                      <div class="text-caption text-weight-medium">
                        {{ colorDef.label }}
                      </div>
                      <q-input
                        :model-value="branding[colorDef.key] as string"
                        @update:model-value="
                          (val) => updateColor(colorDef.key, val as string)
                        "
                        dense
                        filled
                        placeholder="Hex color"
                      >
                        <template v-slot:append>
                          <q-icon name="colorize" class="cursor-pointer">
                            <q-popup-proxy
                              cover
                              transition-show="scale"
                              transition-hide="scale"
                            >
                              <q-color
                                :model-value="branding[colorDef.key] as string"
                                @update:model-value="
                                  (val) =>
                                    updateColor(colorDef.key, val as string)
                                "
                              />
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </div>

      <!-- Preview View -->
      <div v-if="viewMode === 'preview'" :style="previewStyles">
        <q-card-section>
          <!-- Preview Components -->
          <div class="row q-gutter-md">
            <div class="col-12">
              <q-card flat>
                <q-card-section>
                  <div class="text-h6">Primary Theme Colors</div>
                  <div class="row q-gutter-sm q-mt-md">
                    <q-chip color="primary" label="Primary" />
                    <q-chip color="secondary" label="Secondary" />
                    <q-chip color="accent" label="Accent" />
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12">
              <q-card flat>
                <q-card-section>
                  <div class="text-h6">Status Colors</div>
                  <div class="row q-gutter-sm q-mt-md">
                    <q-chip color="positive" label="Positive" />
                    <q-chip color="negative" label="Negative" />
                    <q-chip color="warning" label="Warning" />
                    <q-chip color="info" label="Info" />
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12">
              <q-card flat>
                <q-card-section>
                  <div class="text-h6">Buttons</div>
                  <div class="row q-gutter-sm q-mt-md">
                    <q-btn color="primary" label="Primary Button" />
                    <q-btn color="secondary" label="Secondary Button" />
                    <q-btn color="accent" label="Accent Button" />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </div>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn label="Reset" outline color="grey" @click="resetToSaved" />
        <q-btn
          label="Reset to Default"
          outline
          color="grey"
          @click="resetToDefault"
        />
        <q-space />
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
import type { Branding } from "../types";

// Color definitions with labels and defaults
type ColorKey = keyof Pick<
  Branding,
  | "primary_color"
  | "secondary_color"
  | "accent_color"
  | "dark_color"
  | "dark_page_color"
  | "positive_color"
  | "negative_color"
  | "info_color"
  | "warning_color"
>;

interface ColorDefinition {
  key: ColorKey;
  label: string;
  default: string;
}

const colorDefinitions: ColorDefinition[] = [
  { key: "primary_color", label: "Primary", default: "#1976D2" },
  { key: "secondary_color", label: "Secondary", default: "#26A69A" },
  { key: "accent_color", label: "Accent", default: "#9C27B0" },
  { key: "dark_color", label: "Dark", default: "#1D1D1D" },
  { key: "dark_page_color", label: "Dark Page", default: "#121212" },
  { key: "positive_color", label: "Positive", default: "#21BA45" },
  { key: "negative_color", label: "Negative", default: "#C10015" },
  { key: "info_color", label: "Info", default: "#31CCEC" },
  { key: "warning_color", label: "Warning", default: "#F2C037" },
];

const localFavicon = ref<File | null>(null);
const showFaviconModal = ref(false);
const viewMode = ref("builder");

const { branding, isLoading } = brandingStore;

const instance = getCurrentInstance();
const $branding = computed(() => {
  return instance?.appContext.config.globalProperties.$branding || null;
});

const previewStyles = computed(() => {
  const b = branding.value;
  return {
    "--q-primary": b.primary_color || "#1976D2",
    "--q-secondary": b.secondary_color || "#26A69A",
    "--q-accent": b.accent_color || "#9C27B0",
    "--q-positive": b.positive_color || "#21BA45",
    "--q-negative": b.negative_color || "#C10015",
    "--q-info": b.info_color || "#31CCEC",
    "--q-warning": b.warning_color || "#F2C037",
    "--q-dark": b.dark_color || "#1D1D1D",
  };
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

function updateColor(key: ColorKey, value: string) {
  branding.value[key] = value as Branding[ColorKey];
}

function resetToSaved() {
  brandingStore.getBranding();
}

function resetToDefault() {
  brandingStore.resetToDefault();
}

onMounted(() => {
  brandingStore.getBranding();
});
</script>

<style lang="sass" scoped>



.color-preview
  width: 48px
  height: 48px
  border-radius: 8px
  position: relative
  border: 2px solid rgba(0, 0, 0, 0.1)
  display: flex
  align-items: center
  justify-content: center
  transition: transform 0.2s
</style>
