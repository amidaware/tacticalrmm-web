import { ref, onMounted, computed } from "vue";
import { useClientShared } from "./api";

import type { Client, Site } from "./types";

export function useClientDropdown() {
  const { clients, getClients } = useClientShared;

  const client = ref<Client | undefined>();

  const clientOptions = computed(() => {
    return clients.value.map((client) => ({
      label: client.name,
      value: client.id,
    }));
  });

  onMounted(getClients);

  return {
    client,
    clientOptions,
  };
}

export function useSiteDropdown() {
  const { clients, getClients } = useClientShared;

  const site = ref<Site | undefined>();

  const siteOptions = computed(() => {
    return _formatSiteOptions(clients.value);
  });

  onMounted(getClients);

  return {
    site,
    siteOptions,
  };
}

type Option =
  | {
      label: string;
      value: number;
      cat: string;
    }
  | { category: string };

function _formatSiteOptions(data: Client[]) {
  const options = [] as Option[];

  data.forEach((client) => {
    options.push({ category: client.name });
    options.push(
      ...client.sites.map((site) => ({
        label: site.name,
        value: site.id,
        cat: client.name,
      })),
    );
  });

  return options;
}
