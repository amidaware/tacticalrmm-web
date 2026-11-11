<template>
  <div class="q-pa-md">
    <!-- Auto Approval -->
    <div class="text-subtitle2">
      {{ $t("agentModals.patchPolicy.autoApproval") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3">{{ $t("agentModals.patchPolicy.severity") }}</div>
      <div class="col-4"></div>
      <div class="col-5">{{ $t("agentModals.patchPolicy.action") }}</div>
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $t("agentModals.patchPolicy.criticalColon") }}</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.critical"
        :options="severityOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">
        {{ $t("agentModals.patchPolicy.importantColon") }}
      </div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.important"
        :options="severityOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $t("agentModals.patchPolicy.moderateColon") }}</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.moderate"
        :options="severityOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $t("agentModals.patchPolicy.lowColon") }}</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.low"
        :options="severityOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section class="row">
      <div class="col-3">{{ $t("agentModals.patchPolicy.otherColon") }}</div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.other"
        :options="severityOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <!-- Installation Schedule -->
    <div class="text-subtitle2">
      {{ $t("agentModals.patchPolicy.installSchedule") }}
    </div>
    <q-separator />
    <q-card-section class="row">
      <div class="col-3">
        {{ $t("agentModals.patchPolicy.scheduleFrequency") }}
      </div>
      <div class="col-4"></div>
      <q-select
        dense
        class="col-5"
        outlined
        v-model="winupdatepolicy.run_time_frequency"
        :options="frequencyOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <q-card-section
      class="row"
      v-if="winupdatepolicy.run_time_frequency === 'monthly'"
    >
      <div class="col-3">{{ $t("agentModals.patchPolicy.dayOfMonth") }}</div>
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
      <div class="col-3">{{ $t("agentModals.patchPolicy.scheduledTime") }}</div>
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
          :label="$t('agentModals.patchPolicy.days.monday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="1"
          :label="$t('agentModals.patchPolicy.days.tuesday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="2"
          :label="$t('agentModals.patchPolicy.days.wednesday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="3"
          :label="$t('agentModals.patchPolicy.days.thursday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="4"
          :label="$t('agentModals.patchPolicy.days.friday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="5"
          :label="$t('agentModals.patchPolicy.days.saturday')"
        />
        <q-checkbox
          v-model="winupdatepolicy.run_time_days"
          :val="6"
          :label="$t('agentModals.patchPolicy.days.sunday')"
        />
      </div>
    </q-card-section>
    <!-- Reboot After Installation -->
    <div class="text-subtitle2">
      {{ $t("agentModals.patchPolicy.rebootAfterInstall") }}
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
        :options="rebootOptions"
        emit-value
        map-options
      />
    </q-card-section>
    <!-- Failed Patches -->
    <div class="text-subtitle2">
      {{ $t("agentModals.patchPolicy.failedPatches") }}
    </div>
    <q-separator />
    <q-card-section class="row" v-if="!policy">
      <div class="col-5">
        <q-checkbox
          v-model="winupdatepolicy.reprocess_failed_inherit"
          :label="$t('agentModals.patchPolicy.inheritFailed')"
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
          :label="$t('agentModals.patchPolicy.reprocessFailed')"
        />
      </div>

      <div class="col-3">
        <q-input
          dense
          v-model.number="winupdatepolicy.reprocess_failed_times"
          type="number"
          filled
          :label="$t('agentModals.patchPolicy.times')"
          :rules="[
            (val) => val > 0 || $t('agentModals.patchPolicy.greaterThanZero'),
          ]"
        />
      </div>
      <div class="col-3"></div>
      <q-checkbox
        v-model="winupdatepolicy.email_if_fail"
        :label="$t('agentModals.patchPolicy.emailOnFail')"
      />
    </q-card-section>
    <q-card-actions align="left" v-if="policy">
      <q-btn :label="$t('common.submit')" color="primary" @click="submit" />
      <q-btn :label="$t('common.cancel')" @click="$emit('hide')" />
      <q-space />
      <q-btn
        v-if="editing"
        :label="$t('agentModals.patchPolicy.removePolicy')"
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
        { label: this.$t("agentModals.patchPolicy.manual"), value: "manual" },
        { label: this.$t("agentModals.patchPolicy.approve"), value: "approve" },
        { label: this.$t("agentModals.patchPolicy.ignore"), value: "ignore" },
      ],
      frequencyOptions: [
        {
          label: this.$t("agentModals.patchPolicy.dailyWeekly"),
          value: "daily",
        },
        { label: this.$t("agentModals.patchPolicy.monthly"), value: "monthly" },
      ],
      rebootOptions: [
        { label: this.$t("agentModals.patchPolicy.never"), value: "never" },
        {
          label: this.$t("agentModals.patchPolicy.whenRequired"),
          value: "required",
        },
        { label: this.$t("agentModals.patchPolicy.always"), value: "always" },
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
              this.notifySuccess(this.$t("agentModals.patchPolicy.edited"));
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
              this.notifySuccess(this.$t("agentModals.patchPolicy.created"));
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
          title: this.$t("agentModals.patchPolicy.deleteConfirm"),
          cancel: true,
          ok: { label: this.$t("common.delete"), color: "negative" },
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/automation/patchpolicy/${policy.id}/`)
            .then(() => {
              this.$q.loading.hide();
              this.$emit("close");
              this.notifySuccess(this.$t("agentModals.patchPolicy.deleted"));
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
      this.severityOptions.push({
        label: this.$t("agentModals.patchPolicy.inherit"),
        value: "inherit",
      });
      this.frequencyOptions.push({
        label: this.$t("agentModals.patchPolicy.inherit"),
        value: "inherit",
      });
      this.rebootOptions.push({
        label: this.$t("agentModals.patchPolicy.inherit"),
        value: "inherit",
      });
    }
  },
};
</script>
