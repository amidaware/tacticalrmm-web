<template>
  <q-table
    dense
    :rows="filteredDevices"
    :columns="columns"
    :loading="loading"
    row-key="id"
    :pagination="{ rowsPerPage: 0, sortBy: 'name' }"
    :rows-per-page-options="[0]"
    binary-state-sort
    flat
    virtual-scroll
    style="height: 100%"
  >
    <template v-slot:top-left>
      <div class="row items-center">
        <q-btn
          color="primary"
          icon="add"
          label="Add Network Device"
          dense
          no-caps
          @click="addDevice"
        />
        <q-btn
          flat
          dense
          round
          icon="refresh"
          class="q-ml-sm"
          @click="loadDevices"
        />
      </div>
    </template>
    <template v-slot:top-right>
      <q-input
        v-model="localSearch"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search devices"
      >
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
    </template>

    <template v-slot:body="props">
      <q-tr :props="props" class="cursor-pointer" @dblclick="connect(props.row)">
        <q-td auto-width>
          <q-btn
            size="sm"
            color="primary"
            icon="cast_connected"
            label="Connect"
            dense
            no-caps
            @click.stop="connect(props.row)"
          />
        </q-td>
        <q-td auto-width>
          <q-btn size="sm" flat dense round icon="more_vert">
            <q-menu auto-close>
              <q-list dense style="min-width: 120px">
                <q-item clickable @click="editDevice(props.row)">
                  <q-item-section side
                    ><q-icon size="xs" name="edit"
                  /></q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>
                <q-item clickable @click="deleteDevice(props.row)">
                  <q-item-section side
                    ><q-icon size="xs" name="delete" color="negative"
                  /></q-item-section>
                  <q-item-section>Delete</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </q-td>
        <q-td>{{ props.row.name }}</q-td>
        <q-td>
          <q-badge :color="protoColor(props.row.protocol)">{{
            props.row.protocol.toUpperCase()
          }}</q-badge>
        </q-td>
        <q-td>{{ props.row.ip_address }}:{{ props.row.port }}</q-td>
        <q-td>{{ props.row.client_name }} \ {{ props.row.site_name }}</q-td>
        <q-td>
          <span
            v-for="(a, i) in props.row.preferred_agents_info"
            :key="a.agent_id"
          >
            <q-icon
              name="circle"
              size="8px"
              :color="a.status === 'online' ? 'green' : 'grey'"
            />
            {{ a.hostname
            }}{{ i < props.row.preferred_agents_info.length - 1 ? ", " : "" }}
          </span>
          <span
            v-if="!props.row.preferred_agents_info.length"
            class="text-grey-6"
            >auto</span
          >
        </q-td>
        <q-td>{{ props.row.description }}</q-td>
      </q-tr>
    </template>

    <template v-slot:no-data>
      <div class="full-width row flex-center q-pa-md text-grey-6">
        No network devices. Click "Add Network Device" to create one.
      </div>
    </template>
  </q-table>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
import {
  fetchNetworkDevices,
  removeNetworkDevice,
  connectNetworkDevice,
} from "@/api/netdevices";
import { runRemoteProxy } from "@/api/agents";
import { notifySuccess } from "@/utils/notify";
import NetworkDeviceForm from "@/components/netdevices/NetworkDeviceForm.vue";

export default {
  name: "NetworkDevicesTable",
  props: {
    client: { type: [Number, String], default: null },
    site: { type: [Number, String], default: null },
    search: { type: String, default: "" },
  },
  setup(props) {
    const $q = useQuasar();
    const devices = ref([]);
    const loading = ref(false);
    const localSearch = ref(props.search || "");

    const columns = [
      { name: "connect", label: "", field: "connect", align: "left" },
      { name: "actions", label: "", field: "actions", align: "left" },
      { name: "name", label: "Name", field: "name", align: "left", sortable: true },
      { name: "protocol", label: "Protocol", field: "protocol", align: "left", sortable: true },
      { name: "address", label: "Address", field: "ip_address", align: "left" },
      { name: "location", label: "Client \\ Site", field: "site_name", align: "left", sortable: true },
      { name: "agents", label: "Preferred Agents", field: "agents", align: "left" },
      { name: "description", label: "Description", field: "description", align: "left" },
    ];

    const filteredDevices = computed(() => {
      const s = (localSearch.value || "").toLowerCase().trim();
      if (!s) return devices.value;
      return devices.value.filter((d) =>
        [d.name, d.ip_address, d.protocol, d.site_name, d.client_name, d.description]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(s)),
      );
    });

    async function loadDevices() {
      loading.value = true;
      try {
        const params = {};
        if (props.site) params.site = props.site;
        else if (props.client) params.client = props.client;
        devices.value = await fetchNetworkDevices(params);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    function protoColor(p) {
      return { https: "green", http: "teal", ssh: "deep-purple", telnet: "orange" }[p] || "grey";
    }

    function addDevice() {
      $q.dialog({
        component: NetworkDeviceForm,
        componentProps: {
          site: props.site ? Number(props.site) : null,
          client: props.client ? Number(props.client) : null,
        },
      }).onOk(loadDevices);
    }

    function editDevice(device) {
      $q.dialog({
        component: NetworkDeviceForm,
        componentProps: { device },
      }).onOk(loadDevices);
    }

    function deleteDevice(device) {
      $q.dialog({
        title: "Delete Network Device",
        message: `Delete ${device.name}?`,
        cancel: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        try {
          const r = await removeNetworkDevice(device.id);
          notifySuccess(r);
          loadDevices();
        } catch (e) {
          console.error(e);
        }
      });
    }

    async function connect(device) {
      try {
        const info = await connectNetworkDevice(device.id);
        const query = {
          protocol: info.protocol,
          address: info.address,
          port: info.port,
        };
        if (info.protocol === "http" || info.protocol === "https") {
          query.autoconnect = 1;
        }
        notifySuccess(`Connecting via ${info.agent_hostname}`);
        runRemoteProxy(info.agent_id, query);
      } catch (e) {
        console.error(e);
      }
    }

    watch(
      () => [props.client, props.site],
      () => loadDevices(),
    );
    watch(
      () => props.search,
      (v) => (localSearch.value = v),
    );

    onMounted(loadDevices);

    return {
      devices,
      filteredDevices,
      columns,
      loading,
      localSearch,
      protoColor,
      loadDevices,
      addDevice,
      editDevice,
      deleteDevice,
      connect,
    };
  },
};
</script>
