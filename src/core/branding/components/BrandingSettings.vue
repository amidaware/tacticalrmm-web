<template>
  <!-- Enter must not submit the surrounding Global Settings form -->
  <div @keydown.enter="onEnter">
    <div class="text-subtitle2">Branding</div>
    <q-separator />
    <q-banner v-if="!branding.config" dense class="bg-warning text-black">
      Branding settings could not be loaded. Reload the page to edit them.
    </q-banner>
    <q-card-section class="row items-center">
      <div class="col-4">Product name:</div>
      <q-input
        v-model="form.product_name"
        dense
        outlined
        maxlength="100"
        placeholder="Tactical RMM"
        class="col-8"
      />
    </q-card-section>
    <q-card-section
      v-for="field in colorFields"
      :key="field.key"
      class="row items-center"
    >
      <div class="col-4">{{ field.label }}:</div>
      <q-input
        v-model="form[field.key]"
        dense
        outlined
        placeholder="default"
        :rules="[validHex]"
        hide-bottom-space
        class="col-8"
      >
        <template #prepend>
          <div
            class="color-swatch"
            :style="{ backgroundColor: form[field.key] || 'transparent' }"
          />
        </template>
        <template #append>
          <q-icon name="colorize" class="cursor-pointer">
            <q-popup-proxy>
              <q-color
                v-model="form[field.key]"
                format-model="hex"
                no-header-tabs
              />
            </q-popup-proxy>
          </q-icon>
          <q-icon
            v-if="form[field.key]"
            name="close"
            class="cursor-pointer"
            @click="form[field.key] = ''"
          >
            <q-tooltip>Reset to default</q-tooltip>
          </q-icon>
        </template>
      </q-input>
    </q-card-section>
    <q-card-section>
      <q-btn
        label="Save"
        color="primary"
        :loading="saving"
        :disable="!branding.config"
        @click="save"
      />
    </q-card-section>

    <q-separator />
    <q-card-section
      v-for="img in imageFields"
      :key="img.kind"
      class="row items-center q-col-gutter-sm"
    >
      <div class="col-3">{{ img.label }}:</div>
      <div class="col-3">
        <img
          v-if="branding.imageUrl(img.kind)"
          :src="branding.imageUrl(img.kind) ?? undefined"
          alt=""
          class="image-preview"
        />
        <span v-else class="text-grey">default</span>
      </div>
      <q-file
        :model-value="null"
        dense
        outlined
        :accept="img.accept"
        :label="img.hint"
        class="col"
        @update:model-value="(file: File | null) => upload(img.kind, file)"
      />
      <div class="col-auto">
        <q-btn
          v-if="branding.imageUrl(img.kind)"
          flat
          dense
          icon="delete"
          @click="remove(img.kind)"
        >
          <q-tooltip>Remove</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import { useBrandingStore } from "@/core/branding/store";
import {
  deleteBrandingImage,
  saveBranding,
  uploadBrandingImage,
} from "@/core/branding/api";
import type {
  BrandingImageKind,
  BrandingUpdate,
  ColorKey,
} from "@/core/branding/types";
import { notifyError, notifySuccess } from "@/utils/notify";

const branding = useBrandingStore();
const saving = ref(false);

const form = reactive<BrandingUpdate>({
  product_name: "",
  primary: "",
  secondary: "",
  accent: "",
  header: "",
  dark_primary: "",
  dark_page: "",
});

const colorFields: { key: ColorKey; label: string }[] = [
  { key: "primary", label: "Primary color" },
  { key: "secondary", label: "Secondary color" },
  { key: "accent", label: "Accent color" },
  { key: "header", label: "Header color" },
  { key: "dark_primary", label: "Primary color (dark mode)" },
  { key: "dark_page", label: "Page background (dark mode)" },
];

const imageFields: {
  kind: BrandingImageKind;
  label: string;
  accept: string;
  hint: string;
}[] = [
  {
    kind: "logo",
    label: "Logo",
    accept: ".png,.jpg,.jpeg,.webp,.svg",
    hint: "PNG, JPEG, WebP or SVG, max 512 KB",
  },
  {
    kind: "favicon",
    label: "Favicon",
    accept: ".ico,.png,.svg",
    hint: "ICO, PNG or SVG, max 512 KB",
  },
  {
    kind: "login_background",
    label: "Login background",
    accept: ".png,.jpg,.jpeg,.webp",
    hint: "PNG, JPEG or WebP, max 2 MB",
  },
];

const HEX = /^#[0-9A-Fa-f]{6}$/;

function validHex(value: string) {
  return !value || HEX.test(value) || "Use the format #RRGGBB";
}

function loadForm() {
  const c = branding.config;
  if (!c) return;
  form.product_name = c.product_name;
  for (const field of colorFields) form[field.key] = c[field.key];
}

function onEnter(e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName !== "INPUT") return;
  e.preventDefault();
  save();
}

async function save() {
  // without the current config the form would overwrite saved values with ""
  if (!branding.config) return;
  if (colorFields.some((field) => validHex(form[field.key]) !== true)) {
    notifyError("Fix the invalid colors first");
    return;
  }
  saving.value = true;
  try {
    await saveBranding({ ...form });
    await branding.refresh();
    notifySuccess("Branding saved");
  } catch (e) {
    // the global axios handler already shows the error
    console.error(e);
  } finally {
    saving.value = false;
  }
}

async function upload(kind: BrandingImageKind, file: File | null) {
  if (!file) return;
  try {
    await uploadBrandingImage(kind, file);
    await branding.refresh();
    notifySuccess("Image uploaded");
  } catch (e) {
    console.error(e);
  }
}

async function remove(kind: BrandingImageKind) {
  try {
    await deleteBrandingImage(kind);
    await branding.refresh();
    notifySuccess("Image removed");
  } catch (e) {
    console.error(e);
  }
}

onMounted(async () => {
  await branding.refresh();
  loadForm();
});
</script>

<style scoped>
.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.6);
}

.image-preview {
  max-height: 48px;
  max-width: 100%;
}
</style>
