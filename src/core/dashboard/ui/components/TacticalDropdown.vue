<template>
  <q-select
    dense
    options-dense
    v-model="modelValue"
    :options="filtered ? filteredOptions : options"
    :map-options="mapOptions"
    :emit-value="mapOptions"
    :multiple="multiple"
    :use-chips="multiple"
    :use-input="filterable"
    @[filterEvent]="filterFn"
    v-bind="$attrs"
  >
    <!-- Forward all slots -->
    <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>

    <!-- Custom option rendering -->
    <template v-slot:option="scope">
      <q-item
        v-if="!scope.opt.category"
        v-bind="scope.itemProps"
        class="q-pl-lg"
        :key="mapOptions ? scope.opt.value : scope.opt"
      >
        <q-item-section side v-if="multiple">
          <q-checkbox
            :model-value="scope.selected"
            @update:model-value="
              scope.toggleOption(mapOptions ? scope.opt.value : scope.opt)
            "
            dense
          />
        </q-item-section>
        <q-item-section>
          <q-item-label v-html="mapOptions ? scope.opt.label : scope.opt" />
        </q-item-section>
        <q-item-section
          v-if="
            (filtered && mapOptions && scope.opt.cat) || scope.opt.img_right
          "
          side
        >
          {{ scope.opt.cat || "" }}
          <img
            v-if="scope.opt.img_right"
            :src="scope.opt.img_right"
            style="height: 20px; max-width: 20px"
          />
        </q-item-section>
      </q-item>
      <q-item-label
        v-if="scope.opt.category"
        header
        class="q-pa-sm"
        :key="scope.opt.category"
      >
        {{ scope.opt.category }}
      </q-item-label>
    </template>
  </q-select>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { isLabeledOption, Option } from "@/core/dashboard/types";

// Define component props with types.
const props = defineProps<{
  mapOptions?: boolean;
  multiple?: boolean;
  filterable?: boolean;
  options: (string | Option)[];
}>();

const modelValue = defineModel("modelValue");

const mapOptions = props.mapOptions ?? false;
const multiple = props.multiple ?? false;
const filterable = props.filterable ?? false;

const filtered = ref<boolean>(false);
const filteredOptions = ref<(string | Option)[]>(props.options);

function filterFn(val: string, update: (cb: () => void) => void): void {
  update(() => {
    if (val === "") {
      filtered.value = false;
      filteredOptions.value = props.options;
    } else {
      filtered.value = true;
      const needle = val.toLowerCase();

      if (!mapOptions) {
        // For simple string options.
        filteredOptions.value = props.options.filter(
          (v) => typeof v === "string" && v.toLowerCase().includes(needle),
        );
      } else {
        // For object options (ignoring those with a category).
        filteredOptions.value = props.options.filter((v) => {
          if (typeof v !== "string" && isLabeledOption(v)) {
            return v.label.toLowerCase().includes(needle);
          }
          return false;
        });
      }
    }
  });
}

// Compute the filter event name only when filtering is enabled.
const filterEvent = computed(() => (filterable ? "filter" : null));
</script>
