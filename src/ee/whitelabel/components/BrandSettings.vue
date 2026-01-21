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
    <q-form ref="formRef" greedy>
      <q-card flat>
        <q-card-section class="row q-py-sm">
          <div class="col-4">Company Name</div>
          <div class="col-2"></div>
          <q-input filled dense v-model="branding.company_name" class="col-6" />
        </q-card-section>
        <q-card-section class="row q-py-sm">
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
        <div class="row items-center q-mb-sm">
          <div class="col">
            <div class="text-h6">Theme Builder</div>
          </div>
          <div class="col-auto">
            <q-btn
              icon="visibility"
              label="Preview"
              color="primary"
              outline
              @click="showPreviewModal = true"
            />
          </div>
        </div>
        <div>
          <q-card-section class="q-pa-sm">
            <div class="text-subtitle2 q-my-sm">Toolbar</div>

            <q-card-section class="q-pa-sm">
              <div class="row items-center q-gutter-sm">
                <div
                  class="color-preview"
                  :style="{
                    backgroundColor:
                      branding.toolbar_color ||
                      getDefaultColor('toolbar_color'),
                    color: getTextColor('toolbar_color'),
                  }"
                >
                  <span class="text-caption">Aa</span>
                </div>
                <div class="col-4">
                  <q-input
                    :model-value="branding.toolbar_color"
                    @update:model-value="
                      (val: string) => updateColor('toolbar_color', val)
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
                            :model-value="branding.toolbar_color"
                            @update:model-value="
                              (val: string) => updateColor('toolbar_color', val)
                            "
                          />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
            <div class="text-subtitle2 q-my-sm">Color Palette</div>

            <!-- Color Grid -->
            <div class="row q-col-gutter-sm">
              <div
                v-for="colorDef in colorDefinitions"
                :key="colorDef.key"
                class="col-4"
              >
                <template v-if="colorDef.key !== 'toolbar_color'">
                  <q-card flat bordered>
                    <q-card-section class="q-pa-xs">
                      <div class="row items-center q-gutter-xs">
                        <div
                          class="color-preview-sm"
                          :style="{
                            backgroundColor:
                              (branding[colorDef.key] as string) ||
                              colorDef.default,
                            color: getTextColor(colorDef.key),
                          }"
                        >
                          <span class="text-caption">Aa</span>
                        </div>
                        <div class="col">
                          <div class="text-caption text-weight-medium">
                            {{ colorDef.label }}
                          </div>
                          <q-input
                            :model-value="branding[colorDef.key] as string"
                            @update:model-value="
                              (val: string) => updateColor(colorDef.key, val)
                            "
                            :rules="getColorRules(colorDef.key)"
                            reactive-rules
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
                                    format-model="hexa"
                                    :model-value="
                                      branding[colorDef.key] as string
                                    "
                                    @update:model-value="
                                      (val: string) =>
                                        updateColor(colorDef.key, val)
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
                </template>
              </div>
            </div>
          </q-card-section>
        </div>

        <q-card-actions align="right" class="q-pa-sm">
          <q-btn label="Reset" outline @click="resetToSaved" />
          <q-btn label="Reset to Default" outline @click="resetToDefault" />
          <q-space />
          <q-btn label="Save" color="primary" @click="submit" />
        </q-card-actions>

        <q-inner-loading :showing="isLoading">
          <q-spinner color="primary" size="3em" />
        </q-inner-loading>
      </q-card>
    </q-form>

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

    <!-- Theme Preview Modal -->
    <q-dialog v-model="showPreviewModal" maximized>
      <q-layout view="hHh lpR fFf" container :style="previewStyles">
        <!-- Preview Toolbar -->
        <q-header
          :style="{
            backgroundColor:
              branding.toolbar_color || getDefaultColor('toolbar_color'),
            color: branding.toolbar_text_color || '#FFFFFF',
          }"
        >
          <q-toolbar>
            <q-btn
              flat
              round
              icon="menu"
              :style="{ color: branding.toolbar_text_color || '#FFFFFF' }"
            />
            <q-toolbar-title>
              {{ branding.company_name || "Company Name" }}
            </q-toolbar-title>
            <q-btn
              flat
              round
              :icon="previewDarkMode ? 'light_mode' : 'dark_mode'"
              :style="{ color: branding.toolbar_text_color || '#FFFFFF' }"
              @click="previewDarkMode = !previewDarkMode"
            >
              <q-tooltip>Toggle light/dark mode</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              icon="search"
              :style="{ color: branding.toolbar_text_color || '#FFFFFF' }"
            />
            <q-btn
              flat
              round
              icon="notifications"
              :style="{ color: branding.toolbar_text_color || '#FFFFFF' }"
            />
            <q-btn
              flat
              round
              icon="close"
              :style="{ color: branding.toolbar_text_color || '#FFFFFF' }"
              @click="showPreviewModal = false"
            />
          </q-toolbar>
        </q-header>

        <q-page-container>
          <q-page
            class="q-pa-lg"
            :style="{
              background: previewDarkMode
                ? 'var(--q-dark-page)'
                : 'var(--q-light-page)',
            }"
          >
            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Primary Theme Colors</div>
                    <div class="row q-gutter-sm">
                      <q-chip
                        color="primary"
                        label="Primary"
                        :style="{ color: getTextColor('primary_color') }"
                      />
                      <q-chip
                        color="secondary"
                        label="Secondary"
                        :style="{ color: getTextColor('secondary_color') }"
                      />
                      <q-chip
                        color="accent"
                        label="Accent"
                        :style="{ color: getTextColor('accent_color') }"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Status Colors</div>
                    <div class="row q-gutter-sm">
                      <q-chip
                        color="positive"
                        label="Positive"
                        :style="{ color: getTextColor('positive_color') }"
                      />
                      <q-chip
                        color="negative"
                        label="Negative"
                        :style="{ color: getTextColor('negative_color') }"
                      />
                      <q-chip
                        color="warning"
                        label="Warning"
                        :style="{ color: getTextColor('warning_color') }"
                      />
                      <q-chip
                        color="info"
                        label="Info"
                        :style="{ color: getTextColor('info_color') }"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Buttons</div>
                    <div class="row q-gutter-sm q-mb-md">
                      <q-btn
                        color="primary"
                        label="Primary"
                        :style="{ color: getTextColor('primary_color') }"
                      />
                      <q-btn
                        color="secondary"
                        label="Secondary"
                        :style="{ color: getTextColor('secondary_color') }"
                      />
                      <q-btn
                        color="accent"
                        label="Accent"
                        :style="{ color: getTextColor('accent_color') }"
                      />
                    </div>
                    <div class="row q-gutter-sm q-mb-md">
                      <q-btn
                        color="positive"
                        label="Positive"
                        :style="{ color: getTextColor('positive_color') }"
                      />
                      <q-btn
                        color="negative"
                        label="Negative"
                        :style="{ color: getTextColor('negative_color') }"
                      />
                      <q-btn
                        color="warning"
                        label="Warning"
                        :style="{ color: getTextColor('warning_color') }"
                      />
                      <q-btn
                        color="info"
                        label="Info"
                        :style="{ color: getTextColor('info_color') }"
                      />
                    </div>
                    <div class="row q-gutter-sm">
                      <q-btn color="primary" outline label="Outline Primary" />
                      <q-btn color="secondary" flat label="Flat Secondary" />
                      <q-btn color="accent" unelevated label="Unelevated" />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Form Controls</div>
                    <div class="q-gutter-md">
                      <q-input
                        v-model="previewInput"
                        filled
                        label="Text Input"
                        color="primary"
                      />
                      <q-select
                        v-model="previewSelect"
                        filled
                        :options="['Option 1', 'Option 2', 'Option 3']"
                        label="Select"
                        color="primary"
                      />
                      <div class="row q-gutter-md items-center">
                        <q-toggle
                          v-model="previewToggle"
                          label="Toggle"
                          color="primary"
                        />
                        <q-checkbox
                          v-model="previewCheckbox"
                          label="Checkbox"
                          color="secondary"
                        />
                        <q-radio
                          v-model="previewRadio"
                          val="1"
                          label="Radio"
                          color="accent"
                        />
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Table Preview</div>
                    <TacticalTable
                      :rows="previewTableRows"
                      :columns="previewTableColumns"
                      row-key="id"
                      dense
                      :rows-per-page-options="[0]"
                      hide-pagination
                    />
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Badges & Banners</div>
                    <div class="row q-gutter-md q-mb-md">
                      <q-badge color="primary" label="Primary" />
                      <q-badge color="secondary" label="Secondary" />
                      <q-badge color="accent" label="Accent" />
                      <q-badge color="positive" label="Positive" />
                      <q-badge color="negative" label="Negative" />
                      <q-badge color="warning" label="Warning" />
                      <q-badge color="info" label="Info" />
                    </div>
                    <q-banner class="bg-positive text-white q-mb-sm" dense>
                      <template v-slot:avatar>
                        <q-icon name="check_circle" />
                      </template>
                      Success message
                    </q-banner>
                    <q-banner class="bg-warning text-white q-mb-sm" dense>
                      <template v-slot:avatar>
                        <q-icon name="warning" />
                      </template>
                      Warning message
                    </q-banner>
                    <q-banner class="bg-info text-white q-mb-sm" dense>
                      <template v-slot:avatar>
                        <q-icon name="info" />
                      </template>
                      Info message
                    </q-banner>
                    <q-banner class="bg-negative text-white" dense>
                      <template v-slot:avatar>
                        <q-icon name="error" />
                      </template>
                      Error message
                    </q-banner>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-page>
        </q-page-container>
      </q-layout>
    </q-dialog>
  </template>
</template>

<script lang="ts" setup>
import { ref, onMounted, getCurrentInstance, computed, watch } from "vue";
import { colors, useQuasar, QForm, type QTableColumn } from "quasar";
import { brandingStore } from "../api";
import type { Branding } from "../types";
import TacticalTable from "@/core/dashboard/ui/TacticalTable.vue";

const $q = useQuasar();
const formRef = ref<QForm | null>(null);

const { luminosity } = colors;

type ColorKey = keyof Pick<
  Branding,
  | "primary_color"
  | "secondary_color"
  | "accent_color"
  | "dark_color"
  | "dark_page_color"
  | "light_page_color"
  | "light_color"
  | "positive_color"
  | "negative_color"
  | "info_color"
  | "warning_color"
  | "toolbar_color"
  | "toolbar_text_color"
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
  { key: "light_page_color", label: "Light Page", default: "#F5F5F5" },
  { key: "light_color", label: "Light Card", default: "#FFFFFF" },
  { key: "positive_color", label: "Positive", default: "#21BA45" },
  { key: "negative_color", label: "Negative", default: "#C10015" },
  { key: "info_color", label: "Info", default: "#31CCEC" },
  { key: "warning_color", label: "Warning", default: "#F2C037" },
  { key: "toolbar_color", label: "Toolbar", default: "#424242" },
];

const localFavicon = ref<File | null>(null);
const showFaviconModal = ref(false);
const showPreviewModal = ref(false);
const previewDarkMode = ref($q.dark.isActive);
const originalDarkMode = ref($q.dark.isActive);

// Preview form control states
const previewInput = ref("");
const previewSelect = ref("Option 1");
const previewToggle = ref(true);
const previewCheckbox = ref(true);
const previewRadio = ref("1");

// Preview table data
const previewTableColumns: QTableColumn[] = [
  { name: "hostname", label: "Hostname", field: "hostname", align: "left" },
  { name: "status", label: "Status", field: "status", align: "left" },
  { name: "os", label: "OS", field: "os", align: "left" },
  { name: "lastSeen", label: "Last Seen", field: "lastSeen", align: "left" },
];

const previewTableRows = [
  {
    id: 1,
    hostname: "DESKTOP-ABC123",
    status: "Online",
    os: "Windows 11",
    lastSeen: "Just now",
  },
  {
    id: 2,
    hostname: "SERVER-PROD01",
    status: "Online",
    os: "Windows Server 2022",
    lastSeen: "2 min ago",
  },
  {
    id: 3,
    hostname: "LAPTOP-XYZ789",
    status: "Offline",
    os: "Windows 10",
    lastSeen: "1 hour ago",
  },
  {
    id: 4,
    hostname: "WORKSTATION-42",
    status: "Online",
    os: "Ubuntu 22.04",
    lastSeen: "5 min ago",
  },
];

const { branding, isLoading } = brandingStore;

const instance = getCurrentInstance();
const $branding = computed(() => {
  return instance?.appContext.config.globalProperties.$branding || null;
});

const previewStyles = computed(() => {
  const b = branding.value;
  return {
    "--q-primary": b.primary_color || getDefaultColor("primary_color"),
    "--q-secondary": b.secondary_color || getDefaultColor("secondary_color"),
    "--q-accent": b.accent_color || getDefaultColor("accent_color"),
    "--q-positive": b.positive_color || getDefaultColor("positive_color"),
    "--q-negative": b.negative_color || getDefaultColor("negative_color"),
    "--q-info": b.info_color || getDefaultColor("info_color"),
    "--q-warning": b.warning_color || getDefaultColor("warning_color"),
    "--q-dark": b.dark_color || getDefaultColor("dark_color"),
    "--q-dark-page": b.dark_page_color || getDefaultColor("dark_page_color"),
    "--q-light-page": b.light_page_color || getDefaultColor("light_page_color"),
    "--q-light": b.light_color || getDefaultColor("light_color"),
  };
});

// Get default color for a color key
function getDefaultColor(colorKey: ColorKey): string {
  return colorDefinitions.find((c) => c.key === colorKey)?.default || "#1976D2";
}

// Calculate contrasting text color based on background luminance using Quasar's color utils
function getContrastTextColor(bgColor: string): string {
  if (!bgColor || bgColor.trim() === "") return "#FFFFFF";
  try {
    const lum = luminosity(bgColor.trim());
    return lum > 0.5 ? "#000000" : "#FFFFFF";
  } catch {
    return "#FFFFFF";
  }
}

// Get text color for a given color key - calculates based on actual or default background color
function getTextColor(colorKey: ColorKey): string {
  // For toolbar, use the stored toolbar_text_color if available
  if (colorKey === "toolbar_color" && branding.value.toolbar_text_color) {
    return branding.value.toolbar_text_color;
  }

  // Get the background color (use default if not set)
  const bgColor =
    (branding.value[colorKey] as string) || getDefaultColor(colorKey);

  return getContrastTextColor(bgColor);
}

// setup stores
async function submit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

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

// Check if a color is dark enough (luminosity <= 0.5)
function isDarkColor(color: string): boolean {
  if (!color || color.trim() === "") return true;
  try {
    return luminosity(color.trim()) <= 0.5;
  } catch {
    return true;
  }
}

// Check if a color is light enough (luminosity > 0.5)
function isLightColor(color: string): boolean {
  if (!color || color.trim() === "") return true;
  try {
    return luminosity(color.trim()) > 0.5;
  } catch {
    return true;
  }
}

// Validation rule for dark colors
function darkColorRule(val: string): boolean | string {
  if (!val || val.trim() === "") return true;
  return isDarkColor(val) || "Color must be dark (luminosity ≤ 50%)";
}

// Validation rule for light colors
function lightColorRule(val: string): boolean | string {
  if (!val || val.trim() === "") return true;
  return isLightColor(val) || "Color must be light (luminosity > 50%)";
}

// Get validation rules for a color key
function getColorRules(
  colorKey: ColorKey,
): ((val: string) => boolean | string)[] {
  if (colorKey === "dark_color" || colorKey === "dark_page_color") {
    return [darkColorRule];
  }
  if (colorKey === "light_page_color" || colorKey === "light_color") {
    return [lightColorRule];
  }
  return [];
}

function updateColor(key: ColorKey, value: string) {
  branding.value[key] = value as Branding[ColorKey];

  // Automatically calculate toolbar_text_color when toolbar_color changes
  if (key === "toolbar_color") {
    branding.value.toolbar_text_color = getContrastTextColor(value);
  }
}

function resetToSaved() {
  brandingStore.getBranding();
}

// Watch for toolbar_color changes and auto-calculate toolbar_text_color
watch(
  () => branding.value.toolbar_color,
  (newColor) => {
    if (newColor) {
      branding.value.toolbar_text_color = getContrastTextColor(newColor);
    }
  },
);

// Watch for preview modal open/close to manage dark mode
watch(showPreviewModal, (isOpen) => {
  if (isOpen) {
    originalDarkMode.value = $q.dark.isActive;
    $q.dark.set(previewDarkMode.value);
  } else {
    $q.dark.set(originalDarkMode.value);
  }
});

// Watch for preview dark mode toggle
watch(previewDarkMode, (isDark) => {
  if (showPreviewModal.value) {
    $q.dark.set(isDark);
  }
});

function resetToDefault() {
  brandingStore.resetToDefault();
}

onMounted(() => {
  brandingStore.getBranding();
  // Calculate toolbar_text_color after loading if needed
  setTimeout(() => {
    if (branding.value.toolbar_color && !branding.value.toolbar_text_color) {
      branding.value.toolbar_text_color = getContrastTextColor(
        branding.value.toolbar_color,
      );
    }
  }, 100);
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

.color-preview-sm
  width: 36px
  height: 36px
  border-radius: 6px
  position: relative
  border: 2px solid rgba(0, 0, 0, 0.1)
  display: flex
  align-items: center
  justify-content: center
  flex-shrink: 0
</style>
