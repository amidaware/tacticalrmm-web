<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card
      class="q-dialog-plugin"
      style="min-width: 80vw; min-height: 65vh; overflow-x: hidden"
    >
      <q-bar>
        <q-btn
          @click="getChartData"
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
        />
        {{ title }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <div class="row">
        <span v-if="!showChart" class="q-pa-md">{{
          $t("checks.graph.noData")
        }}</span>
        <q-space />
        <q-select
          v-model="timeFilter"
          emit-value
          map-options
          style="width: 200px"
          :options="timeFilterOptions"
          outlined
          dense
          class="q-pr-md q-pt-md"
          @update:model-value="getChartData"
        />
      </div>
      <apexchart
        v-if="showChart"
        class="q-pt-md"
        type="line"
        height="70%"
        :options="chartOptions"
        :series="[{ name: seriesName, data: history }]"
      />
    </q-card>
  </q-dialog>
</template>
<script>
import VueApexCharts from "vue3-apexcharts";

export default {
  name: "CheckGraph",
  emits: ["hide", "ok", "cancel"],
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    check: !Object,
  },
  data() {
    return {
      history: [],
      results: [],
      timeFilter: 1,
      chartOptions: {
        tooltip: {
          x: {
            format: "dd MMM h:mm:sst",
          },
        },
        chart: {
          id: "chart2",
          type: "line",
          toolbar: {
            show: true,
          },
          animations: {
            enabled: false,
          },
        },
        colors: ["#027BE3"],
        stroke: {
          width: 3,
        },
        dataLabels: {
          enabled: false,
        },
        fill: {
          opacity: 1,
        },
        markers: {
          size: 1,
        },
        xaxis: {
          type: "datetime",
          labels: {
            datetimeUTC: false,
          },
        },
        noData: {
          text: this.$t("checks.graph.noData"),
        },
        theme: {
          mode: this.$q.dark.isActive ? "dark" : "light",
        },
      },
    };
  },
  computed: {
    title() {
      return this.$t("checks.graph.historyTitle", {
        name: this.check.readable_desc,
      });
    },
    timeFilterOptions() {
      return [
        { value: 1, label: this.$t("checks.graph.filters.last24Hours") },
        { value: 7, label: this.$t("checks.graph.filters.last7Days") },
        { value: 30, label: this.$t("checks.graph.filters.last30Days") },
        { value: 0, label: this.$t("checks.graph.filters.everything") },
      ];
    },
    showChart() {
      return !this.$q.loading.isActive && this.history.length > 0;
    },
    seriesName() {
      if (this.check.check_type === "cpuload")
        return this.$t("checks.graph.series.cpuLoad");
      else if (this.check.check_type === "memory")
        return this.$t("checks.graph.series.memoryUsage");
      else if (this.check.check_type === "diskspace")
        return this.$t("checks.graph.series.diskSpaceRemaining");
      else if (this.check.check_type === "script")
        return this.$t("checks.graph.series.scriptResults");
      else if (this.check.check_type === "eventlog")
        return this.$t("checks.graph.series.status");
      else if (this.check.check_type === "winsvc")
        return this.$t("checks.graph.series.status");
      else if (this.check.check_type === "ping")
        return this.$t("checks.graph.series.status");
      else return "";
    },
  },
  methods: {
    getChartData() {
      this.$q.loading.show();

      this.$axios
        .patch(`/checks/${this.check.check_result.id}/history/`, {
          timeFilter: this.timeFilter,
        })
        .then((r) => {
          this.history = Object.freeze(r.data);

          // save copy of data to reference results in chart tooltip
          if (
            this.check.check_type !== "cpuload" ||
            this.check.check_type !== "memory" ||
            this.check.check_type !== "diskspace"
          ) {
            this.results = Object.freeze(r.data);
          }

          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    show() {
      this.$refs.dialog.show();
    },
    hide() {
      this.$refs.dialog.hide();
    },
    onHide() {
      this.$emit("hide");
    },
  },
  mounted() {
    // create warning and error annotation on chart for certain check types
    if (
      this.check.check_type === "cpuload" ||
      this.check.check_type === "memory" ||
      this.check.check_type === "diskspace"
    ) {
      this.chartOptions["annotations"] = {
        position: "front",
        yaxis: [],
      };

      // add error threshold line if exists
      if (this.check.error_threshold) {
        this.chartOptions["annotations"]["yaxis"].push({
          y: this.check.error_threshold,
          strokeDashArray: 0,
          borderColor: "#C10015",
          label: {
            position: "left",
            offsetX: 100,
            borderColor: "#C10015",
            style: {
              color: "#FFF",
              background: "#C10015",
            },
            text: this.$t("checks.graph.errorThreshold"),
          },
        });
      }

      // add warning threshold line depending on check type
      if (this.check.warning_threshold) {
        this.chartOptions["annotations"]["yaxis"].push({
          y: this.check.warning_threshold,
          strokeDashArray: 0,
          borderColor: "#ff9800",
          label: {
            position: "left",
            offsetX: 100,
            borderColor: "#ff9800",
            style: {
              color: "#FFF",
              background: "#ff9800",
            },
            text: this.$t("checks.graph.warningThreshold"),
          },
        });
      }

      // Set yaxis options
      this.chartOptions["yaxis"] = {
        min: 0,
        max: 100,
        labels: {
          formatter: (val) => {
            return val + "%";
          },
        },
      };

      if (this.check.check_type === "diskspace") {
        this.chartOptions["yaxis"]["reversed"] = true;
      }
    } else {
      // Set the y-axis labels to Failing and Passing
      this.chartOptions["yaxis"] = {
        min: -1,
        max: 2,
        tickAmount: 0,
        reversed: true,
        forceNiceScale: true,
        labels: {
          minWidth: 50,
          formatter: (val) => {
            if (val === 0) return this.$t("checks.graph.passing");
            else if (val === 1) return this.$t("checks.graph.failing");
            else return "";
          },
        },
      };

      // customize the yaxis tooltip to include more information
      this.chartOptions["tooltip"]["y"] = {
        title: {
          formatter: () => {
            return "";
          },
        },
        formatter: (value, { dataPointIndex }) => {
          let formatted = "";
          if (this.check.check_type === "script") {
            formatted += `${this.$t("checks.graph.scriptOutput.returnCode")}: ${
              this.results[dataPointIndex].results.retcode
            }<br/>`;
            formatted += `${this.$t("checks.graph.scriptOutput.stdOut")}: ${
              this.results[dataPointIndex].results.stdout
            }<br/>`;
            formatted += `${this.$t("checks.graph.scriptOutput.errOut")}: ${
              this.results[dataPointIndex].results.errout
            }<br/>`;
            formatted += `${this.$t("checks.graph.scriptOutput.executionTime")}: ${
              this.results[dataPointIndex].results.execution_time
            }<br/>`;
          } else {
            formatted += this.results[dataPointIndex].results;
          }

          return formatted;
        },
      };
    }

    this.getChartData();
  },
};
</script>
