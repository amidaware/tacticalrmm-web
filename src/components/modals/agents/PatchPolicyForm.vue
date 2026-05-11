<template>
  <div class="q-pa-md">
    <!-- Auto Approval -->
    <div class="text-subtitle2">
      {{ $t("agents.patchPolicyForm.autoApproval") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3">{{ $t("agents.patchPolicyForm.severity") }}</div>
      <div class="col-4"></div>
      <div class="col-5">{{ $t("agents.patchPolicyForm.action") }}</div>
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $t("agents.patchPolicyForm.critical") }}:</div>
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
      <div class="col-3">{{ $t("agents.patchPolicyForm.important") }}:</div>
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
      <div class="col-3">{{ $t("agents.patchPolicyForm.moderate") }}:</div>
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
      <div class="col-3">{{ $t("agents.patchPolicyForm.low") }}:</div>
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
      <div class="col-3">{{ $t("agents.patchPolicyForm.other") }}:</div>
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
      {{ $t("agents.patchPolicyForm.installationSchedule") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3">
        {{ $t("agents.patchPolicyForm.scheduleFrequency") }}:
      </div>
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
      <div class="col-3">
        {{ $t("agents.patchPolicyForm.dayOfMonthToRun") }}:
      </div>
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
      <div class="col-3">{{ $t("agents.patchPolicyForm.scheduledTime") }}:</div>
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
          :label="$t('agents.patchPolicyForm.days.monday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="1"
          :label="$t('agents.patchPolicyForm.days.tuesday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="2"
          :label="$t('agents.patchPolicyForm.days.wednesday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="3"
          :label="$t('agents.patchPolicyForm.days.thursday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="4"
          :label="$t('agents.patchPolicyForm.days.friday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="5"
          :label="$t('agents.patchPolicyForm.days.saturday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="6"
          :label="$t('agents.patchPolicyForm.days.sunday')"
        />
      </div>
    </q-card-section>
    <!-- Reboot After Installation -->
    <div class="text-subtitle2">
      {{ $t("agents.patchPolicyForm.rebootAfterInstallation") }}
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
      {{ $t("agents.patchPolicyForm.failedPatches") }}
    </div>
    <q-separator />
    <q-card-section class="row" v-if="!policy">
      <div class="col-5">
        <q-checkbox
          v-model="winupdatepolicy.reprocess_failed_inherit"
          :label="$t('agents.patchPolicyForm.inheritFailedPatchSettings')"
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
          :label="$t('agents.patchPolicyForm.reprocessFailedPatches')"
        />
      </div>

      <div class="col-3">
        <q-input
          dense
          v-model.number="winupdatepolicy.reprocess_failed_times"
          type="number"
          filled
          :label="$t('agents.patchPolicyForm.times')"
          :rules="[
            (val) =>
              val > 0 || $t('agents.patchPolicyForm.mustBeGreaterThanZero'),
          ]"
        />
      </div>
      <div class="col-3"></div>
      <q-checkbox
        v-model="winupdatepolicy.email_if_fail"
        :label="$t('agents.patchPolicyForm.sendEmailOnPatchFail')"
      />
    </q-card-section>
    <q-card-actions align="left" v-if="policy">
      <q-btn
        :label="$t('common.actions.submit')"
        color="primary"
        @click="submit"
      />
      <q-btn :label="$t('common.buttons.cancel')" @click="$emit('hide')" />
      <q-space />
      <q-btn
        v-if="editing"
        :label="$t('agents.patchPolicyForm.removePolicy')"
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
                this.$t("agents.patchPolicyForm.notifyEdited"),
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
                this.$t("agents.patchPolicyForm.notifyCreated"),
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
          title: this.$t("agents.patchPolicyForm.deletePatchPolicy"),
          cancel: true,
          ok: { label: this.$t("common.buttons.delete"), color: "negative" },
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/automation/patchpolicy/${policy.id}/`)
            .then(() => {
              this.$q.loading.hide();
              this.$emit("close");
              this.notifySuccess(
                this.$t("agents.patchPolicyForm.notifyDeleted"),
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
        label: this.$t(`agents.patchPolicyForm.optionLabels.${opt.label}`),
      }));
    },
    frequencyOptionsLocalized() {
      return this.frequencyOptions.map((opt) => ({
        ...opt,
        label: this.$t(`agents.patchPolicyForm.optionLabels.${opt.label}`),
      }));
    },
    rebootOptionsLocalized() {
      return this.rebootOptions.map((opt) => ({
        ...opt,
        label: this.$t(`agents.patchPolicyForm.optionLabels.${opt.label}`),
      }));
    },
  },
};
</script>
