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
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <div class="row">
        <span v-if="!showChart" class="q-pa-md">{{ $gettext("No Data") }}</span>
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
      baseChartOptions: {
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
          text: this.$gettext("No Data"),
        },
        theme: {
          mode: this.$q.dark.isActive ? "dark" : "light",
        },
      },
    };
  },
  computed: {
    chartOptions() {
      const annotations = this.baseChartOptions.annotations;
      return {
        ...this.baseChartOptions,
        noData: {
          ...this.baseChartOptions.noData,
          text: this.$gettext("No Data"),
        },
        ...(annotations
          ? {
              annotations: {
                ...annotations,
                yaxis: annotations.yaxis.map((annotation) => ({
                  ...annotation,
                  label: {
                    ...annotation.label,
                    text:
                      annotation.id === "error-threshold"
                        ? this.$gettext("Error Threshold")
                        : annotation.id === "warning-threshold"
                          ? this.$gettext("Warning Threshold")
                          : annotation.label.text,
                  },
                })),
              },
            }
          : {}),
      };
    },

    title() {
      return this.$gettext("%{name} history", {
        name: this.check.readable_desc,
      });
    },
    timeFilterOptions() {
      return [
        { value: 1, label: this.$gettext("Last 24 Hours") },
        { value: 7, label: this.$gettext("Last 7 Days") },
        { value: 30, label: this.$gettext("Last 30 Days") },
        { value: 0, label: this.$pgettext("Check history", "Everything") },
      ];
    },
    showChart() {
      return !this.$q.loading.isActive && this.history.length > 0;
    },
    seriesName() {
      if (this.check.check_type === "cpuload") return this.$gettext("CPU Load");
      else if (this.check.check_type === "memory")
        return this.$gettext("Memory Usage");
      else if (this.check.check_type === "diskspace")
        return this.$gettext("Disk Space Remaining");
      else if (this.check.check_type === "script")
        return this.$gettext("Script Results");
      else if (this.check.check_type === "eventlog")
        return this.$pgettext("Check history", "Status");
      else if (this.check.check_type === "winsvc")
        return this.$pgettext("Check history", "Status");
      else if (this.check.check_type === "ping")
        return this.$pgettext("Check history", "Status");
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
      this.baseChartOptions["annotations"] = {
        position: "front",
        yaxis: [],
      };

      // add error threshold line if exists
      if (this.check.error_threshold) {
        this.baseChartOptions["annotations"]["yaxis"].push({
          id: "error-threshold",
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
            text: this.$gettext("Error Threshold"),
          },
        });
      }

      // add warning threshold line depending on check type
      if (this.check.warning_threshold) {
        this.baseChartOptions["annotations"]["yaxis"].push({
          id: "warning-threshold",
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
            text: this.$gettext("Warning Threshold"),
          },
        });
      }

      // Set yaxis options
      this.baseChartOptions["yaxis"] = {
        min: 0,
        max: 100,
        labels: {
          formatter: (val) => {
            return val + "%";
          },
        },
      };

      if (this.check.check_type === "diskspace") {
        this.baseChartOptions["yaxis"]["reversed"] = true;
      }
    } else {
      // Set the y-axis labels to Failing and Passing
      this.baseChartOptions["yaxis"] = {
        min: -1,
        max: 2,
        tickAmount: 0,
        reversed: true,
        forceNiceScale: true,
        labels: {
          minWidth: 50,
          formatter: (val) => {
            if (val === 0) return this.$gettext("Passing");
            else if (val === 1) return this.$gettext("Failing");
            else return "";
          },
        },
      };

      // customize the yaxis tooltip to include more information
      this.baseChartOptions["tooltip"]["y"] = {
        title: {
          formatter: () => {
            return "";
          },
        },
        formatter: (value, { dataPointIndex }) => {
          let formatted = "";
          if (this.check.check_type === "script") {
            formatted += `${this.$gettext("Return Code")}: ${
              this.results[dataPointIndex].results.retcode
            }<br/>`;
            formatted += `${this.$gettext("Std Out")}: ${
              this.results[dataPointIndex].results.stdout
            }<br/>`;
            formatted += `${this.$gettext("Err Out")}: ${
              this.results[dataPointIndex].results.errout
            }<br/>`;
            formatted += `${this.$gettext("Execution Time")}: ${
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
