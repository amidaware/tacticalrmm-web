<template>
  <div class="q-pa-md">
    <!-- Auto Approval -->
    <div class="text-subtitle2">
      {{ $gettext("Auto Approval") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3">
        {{ $pgettext("Windows update policy", "Severity") }}
      </div>
      <div class="col-4"></div>
      <div class="col-5">
        {{ $pgettext("Windows update policy", "Action") }}
      </div>
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">
        {{ $pgettext("Windows update policy", "Critical") }}:
      </div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.critical"
        :options="severityOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">
        {{ $pgettext("Windows update policy", "Important") }}:
      </div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.important"
        :options="severityOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $gettext("Moderate") }}:</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.moderate"
        :options="severityOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $pgettext("Windows update policy", "Low") }}:</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.low"
        :options="severityOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">
        {{ $pgettext("Windows update policy", "Other") }}:
      </div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.other"
        :options="severityOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <!-- Installation Schedule -->
    <div class="text-subtitle2">
      {{ $gettext("Installation Schedule") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3">{{ $gettext("Schedule Frequency") }}:</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.run_time_frequency"
        :options="frequencyOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section
      class="row"
      v-if="winupdatepolicy.run_time_frequency === 'monthly'"
    >
      <div class="col-3">{{ $gettext("Day of month to run") }}:</div>
      <div class="col-4"></div>
      <q-select
        v-show="winupdatepolicy.run_time_frequency !== 'inherit'"
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.run_time_day"
        :options="monthDays"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section
      class="row"
      v-show="winupdatepolicy.run_time_frequency !== 'inherit'"
    >
      <div class="col-3">{{ $gettext("Scheduled Time") }}:</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.run_time_hour"
        :options="timeOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section
      v-if="winupdatepolicy.run_time_frequency === 'daily'"
      v-show="winupdatepolicy.run_time_frequency !== 'inherit'"
    >
      <div class="q-gutter-sm">
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="0"
          :label="$gettext('Monday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="1"
          :label="$gettext('Tuesday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="2"
          :label="$gettext('Wednesday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="3"
          :label="$gettext('Thursday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="4"
          :label="$gettext('Friday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="5"
          :label="$gettext('Saturday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="6"
          :label="$gettext('Sunday')"
        />
      </div>
    </q-card-section>
    <!-- Reboot After Installation -->
    <div class="text-subtitle2">
      {{ $gettext("Reboot After Installation") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3"></div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.reboot_after_install"
        :options="rebootOptionsLocalized"
        emit-value
        map-options
      />
    </q-card-section>
    <!-- Failed Patches -->
    <div class="text-subtitle2">
      {{ $gettext("Failed Patches") }}
    </div>
    <q-separator />
    <q-card-section class="row" v-if="!policy">
      <div class="col-5">
        <q-checkbox
          v-model="winupdatepolicy.reprocess_failed_inherit"
          :label="$gettext('Inherit failed patch settings')"
        />
      </div>
    </q-card-section>
    <q-card-section
      class="row"
      v-show="!winupdatepolicy.reprocess_failed_inherit"
    >
      <div class="col-5">
        <q-checkbox
          v-model="winupdatepolicy.reprocess_failed"
          :label="$gettext('Reprocess failed patches')"
        />
      </div>

      <div class="col-3">
        <q-input
          dense
          v-model.number="winupdatepolicy.reprocess_failed_times"
          type="number"
          filled
          :label="$gettext('Times')"
          :rules="[(val) => val > 0 || $gettext('Must be greater than 0')]"
        />
      </div>
      <div class="col-3"></div>
      <q-checkbox
        v-model="winupdatepolicy.email_if_fail"
        :label="$gettext('Send an email when patch installation fails')"
      />
    </q-card-section>
    <q-card-actions align="left" v-if="policy">
      <q-btn :label="$gettext('Submit')" color="primary" @click="submit" />
      <q-btn :label="$gettext('Cancel')" @click="$emit('hide')" />
      <q-space />
      <q-btn
        v-if="editing"
        :label="$gettext('Remove Policy')"
        color="negative"
        @click="deletePolicy(winupdatepolicy)"
      />
    </q-card-actions>
  </div>
</template>

<script>
import { scheduledTimes, monthDays } from "@/mixins/data";
import mixins from "@/mixins/mixins";

export default {
  name: "PatchPolicyForm",
  emits: ["close", "hide"],
  props: {
    policy: Object,
    agent: Object,
  },
  mixins: [mixins],
  data() {
    return {
      editing: true,
      winupdatepolicy: {},
      defaultWinUpdatePolicy: {
        critical: "ignore",
        important: "ignore",
        moderate: "ignore",
        low: "ignore",
        other: "ignore",
        run_time_hour: 3,
        run_time_frequency: "daily",
        run_time_days: [],
        run_time_day: 1,
        reboot_after_install: "never",
        reprocess_failed_inherit: false,
        reprocess_failed: false,
        reprocess_failed_times: 5,
        email_if_fail: false,
      },
      severityOptions: [
        { label: "manual", value: "manual" },
        { label: "approve", value: "approve" },
        { label: "ignore", value: "ignore" },
      ],
      frequencyOptions: [
        { label: "dailyWeekly", value: "daily" },
        { label: "monthly", value: "monthly" },
      ],
      rebootOptions: [
        { label: "never", value: "never" },
        { label: "whenRequired", value: "required" },
        { label: "always", value: "always" },
      ],
      timeOptions: scheduledTimes,
      monthDays,
    };
  },
  methods: {
    optionLabel(value) {
      switch (value) {
        case "always":
          return this.$gettext("Always");
        case "approve":
          return this.$gettext("Approve");
        case "dailyWeekly":
          return this.$gettext("Daily/Weekly");
        case "ignore":
          return this.$pgettext("Windows update policy", "Ignore");
        case "inherit":
          return this.$gettext("Inherit");
        case "manual":
          return this.$gettext("Manual");
        case "monthly":
          return this.$gettext("Monthly");
        case "never":
          return this.$gettext("Never");
        case "whenRequired":
          return this.$gettext("When Required");
        default:
          return "agents.patchPolicyForm.optionLabels." + value;
      }
    },
    submit() {
      this.$q.loading.show();

      // modifying patch policy in automation manager
      if (this.policy) {
        // editing patch policy
        if (this.editing) {
          this.$axios
            .put(
              `/automation/patchpolicy/${this.winupdatepolicy.id}/`,
              this.winupdatepolicy,
            )
            .then(() => {
              this.$q.loading.hide();
              this.$emit("close");
              this.notifySuccess(
                this.$gettext("Patch policy was edited successfully!"),
              );
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        } else {
          // adding patch policy
          this.$axios
            .post("/automation/patchpolicy/", this.winupdatepolicy)
            .then(() => {
              this.$q.loading.hide();
              this.$emit("close");
              this.notifySuccess(
                this.$gettext("Patch policy was created successfully!"),
              );
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        }
      }
    },
    deletePolicy(policy) {
      this.$q
        .dialog({
          title: this.$gettext("Delete patch policy?"),
          cancel: true,
          ok: { label: this.$gettext("Delete"), color: "negative" },
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/automation/patchpolicy/${policy.id}/`)
            .then(() => {
              this.$q.loading.hide();
              this.$emit("close");
              this.notifySuccess(
                this.$gettext("Patch policy was deleted successfully!"),
              );
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        });
    },
  },
  mounted() {
    if (this.policy && this.policy.winupdatepolicy[0]) {
      this.winupdatepolicy = this.policy.winupdatepolicy[0];
      this.editing = true;
    } else if (this.policy) {
      this.winupdatepolicy = this.defaultWinUpdatePolicy;
      this.winupdatepolicy.policy = this.policy.id;
      this.editing = false;
    } else if (this.agent) {
      this.winupdatepolicy = this.agent.winupdatepolicy[0];

      // add agent inherit options
      this.severityOptions.push({ label: "inherit", value: "inherit" });
      this.frequencyOptions.push({ label: "inherit", value: "inherit" });
      this.rebootOptions.push({ label: "inherit", value: "inherit" });
    }
  },
  computed: {
    severityOptionsLocalized() {
      return this.severityOptions.map((opt) => ({
        ...opt,
        label: this.optionLabel(opt.label),
      }));
    },
    frequencyOptionsLocalized() {
      return this.frequencyOptions.map((opt) => ({
        ...opt,
        label: this.optionLabel(opt.label),
      }));
    },
    rebootOptionsLocalized() {
      return this.rebootOptions.map((opt) => ({
        ...opt,
        label: this.optionLabel(opt.label),
      }));
    },
  },
};
</script>
