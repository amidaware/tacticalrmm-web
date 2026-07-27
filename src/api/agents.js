import axios from "axios";
import { openURL } from "quasar";
import { router } from "@/router";
import { getCenteredWindowOptions } from "@/utils/helpers";

const baseUrl = "/agents";

export function runTakeControl(agent_id) {
  const url = router.resolve(`/takecontrol/${agent_id}`).href;
  openURL(url, null, {
    ...getCenteredWindowOptions(1600, 900),
  });
}

export function runWebVNC(agent_id, port) {
  const url = router.resolve(`/webvnc/${agent_id}/${port}`).href;
  openURL(url, null, {
    ...getCenteredWindowOptions(1600, 900),
  });
}

export function openAgentWindow(agent_id) {
  const url = router.resolve(`/agents/${agent_id}`).href;
  openURL(url, null, {
    ...getCenteredWindowOptions(1600, 900),
  });
}

// Remembered Auto-approve preference. Lives on the user (not the socket) so the choice
// survives refreshes and applies to every AI chat window the tech opens.
export async function saveAIAutoApprove(value) {
  const { data } = await axios.patch("/accounts/users/ui/", {
    ai_autoapprove_default: !!value,
  });
  return data;
}

// Pi.dev AI assistant
export function runPiChat(agent_id, query = {}) {
  const url = router.resolve({
    path: `/pichat/${agent_id}`,
    query,
  }).href;
  openURL(url, null, {
    popup: true,
    scrollbars: true,
    location: false,
    status: false,
    toolbar: false,
    menubar: false,
    width: 1200,
    height: 900,
  });
}

export async function createPiSession(agent_id, payload = {}) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/pi/session/`, payload);
  return data;
}

// Multi-machine Pi.dev session: machines = [{agent_id, role}]
export async function createPiMultiSession(payload = {}) {
  const { data } = await axios.post(`${baseUrl}/pi/multisession/`, payload);
  return data;
}

export function encodePiMachines(machines) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(machines))));
}

export function decodePiMachines(encoded) {
  return JSON.parse(decodeURIComponent(escape(atob(encoded))));
}

export function runPiMultiChat(machines, query = {}) {
  const url = router.resolve({
    path: "/pichat/multi",
    query: { m: encodePiMachines(machines), ...query },
  }).href;
  openURL(url, null, {
    popup: true,
    scrollbars: true,
    location: false,
    status: false,
    toolbar: false,
    menubar: false,
    width: 1200,
    height: 900,
  });
}

export async function fetchPiHistory(agent_id) {
  const { data } = await axios.get(`${baseUrl}/${agent_id}/pi/history/`);
  return data;
}

export async function deletePiHistory(agent_id, session_id) {
  const { data } = await axios.delete(`${baseUrl}/${agent_id}/pi/history/`, {
    data: { session_id },
  });
  return data;
}

export function runRemoteBackground(agent_id, agentPlatform) {
  const url = router.resolve(
    `/remotebackground/${agent_id}?agentPlatform=${agentPlatform}`,
  ).href;
  openURL(url, null, {
    ...getCenteredWindowOptions(1280, 900),
  });
}

export async function fetchAgents(params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/`, { params: params });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchAgent(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function editAgent(agent_id, payload) {
  const { data } = await axios.put(`${baseUrl}/${agent_id}/`, payload);
  return data;
}

export async function removeAgent(agent_id) {
  const { data } = await axios.delete(`${baseUrl}/${agent_id}/`);
  return data;
}

export async function fetchAgentHistory(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/history/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchAgentChecks(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/checks/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchAgentTasks(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/tasks/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function sendAgentRecovery(agent_id, payload) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/recover/`, payload);
  return data;
}

export async function sendAgentCommand(agent_id, payload) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/cmd/`, payload);
  return data;
}

export async function refreshAgentWMI(agent_id) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/wmi/`);
  return data;
}

export async function runScript(agent_id, payload) {
  const { data } = await axios.post(
    `${baseUrl}/${agent_id}/runscript/`,
    payload,
  );
  return data;
}

export async function runBulkAction(payload) {
  const { data } = await axios.post(`${baseUrl}/actions/bulk/`, payload);
  return data;
}

export async function fetchAgentProcesses(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/processes/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function killAgentProcess(agent_id, pid, params = {}) {
  const { data } = await axios.delete(
    `${baseUrl}/${agent_id}/processes/${pid}/`,
    { params: params },
  );
  return data;
}

export async function fetchAgentEventLog(agent_id, logType, days, params = {}) {
  try {
    const { data } = await axios.get(
      `${baseUrl}/${agent_id}/eventlog/${logType}/${days}/`,
      { params: params },
    );
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchAgentMeshCentralURLs(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/meshcentral/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchAgentWebVNCUrl(agent_id, port) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/${port}/webvnc/`);
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function scheduleAgentReboot(agent_id, payload) {
  const { data } = await axios.patch(`${baseUrl}/${agent_id}/reboot/`, payload);
  return data;
}

export async function agentRebootNow(agent_id) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/reboot/`);
  return data;
}

export async function agentShutdown(agent_id) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/shutdown/`);
  return data;
}

export async function sendAgentRecoverMesh(agent_id, params = {}) {
  const { data } = await axios.post(
    `${baseUrl}/${agent_id}/meshcentral/recover/`,
    { params: params },
  );
  return data;
}

export async function sendAgentPing(agent_id, params = {}) {
  const { data } = await axios.get(`${baseUrl}/${agent_id}/ping/`, {
    params: params,
  });
  return data;
}

// agent notes
export async function fetchAgentNotes(agent_id, params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/notes/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function saveAgentNote(payload) {
  const { data } = await axios.post(`${baseUrl}/notes/`, payload);
  return data;
}

export async function editAgentNote(pk, payload) {
  const { data } = await axios.put(`${baseUrl}/notes/${pk}/`, payload);
  return data;
}

export async function removeAgentNote(pk) {
  const { data } = await axios.delete(`${baseUrl}/notes/${pk}/`);
  return data;
}

export async function wakeUpWOL(agent_id) {
  const { data } = await axios.post(`${baseUrl}/${agent_id}/wol/`);
  return data;
}

export async function fetchAgentRegistry(
  agent_id,
  path,
  page = 1,
  hiveSearch = false,
) {
  try {
    const { data } = await axios.get(`${baseUrl}/${agent_id}/registry/`, {
      params: { path: `${path}`, page, page_size: hiveSearch ? 100000 : 400 },
    });
    return data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function deleteRegistryKey(agent_id, path) {
  try {
    const { data } = await axios.delete(
      `${baseUrl}/${agent_id}/registry/delete-key/`,
      {
        params: { path: `${path}` },
      },
    );
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function createRegistryKey(agent_id, path) {
  try {
    const { data } = await axios.post(
      `${baseUrl}/${agent_id}/registry/create-key/`,
      { path },
    );
    return data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function renameRegistryKey(agent_id, old_path, new_path) {
  try {
    const { data } = await axios.post(
      `${baseUrl}/${agent_id}/registry/rename-key/`,
      { old_path, new_path },
    );
    return data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function deleteRegistryValue(agent_id, path, name) {
  try {
    const { data } = await axios.delete(
      `${baseUrl}/${agent_id}/registry/delete-value/`,
      {
        params: { path, name },
      },
    );
    return data;
  } catch (e) {
    console.error("Failed to delete value:", e);
    throw e;
  }
}

export async function renameRegistryValue(agentId, path, oldName, newName) {
  try {
    const { data } = await axios.post(
      `${baseUrl}/${agentId}/registry/rename-value/`,
      {
        path,
        old_name: oldName,
        new_name: newName,
      },
    );
    return data;
  } catch (e) {
    console.error("Failed to rename value:", e);
    throw e;
  }
}

export async function modifyRegistryValue(
  agentId,
  path,
  name,
  type,
  dataValue,
) {
  try {
    const { data } = await axios.post(
      `${baseUrl}/${agentId}/registry/modify-value/`,
      {
        path,
        name,
        type,
        data: dataValue,
      },
    );
    return data;
  } catch (e) {
    console.error("Failed to modify registry value:", e);
    throw e;
  }
}

export async function createRegistryValue(agentId, path, name, type, data) {
  const formData = new FormData();
  formData.append("path", path);
  formData.append("name", name);
  formData.append("type", type);
  formData.append("data", data);
  try {
    const { data } = await axios.post(
      `${baseUrl}/${agentId}/registry/create-value/`,
      formData,
    );
    return data;
  } catch (e) {
    console.error("Failed to create registry value:", e);
    throw e;
  }
}

export async function fetchAgentTerminalDefaults(agent_id) {
  try {
    const { data } = await axios.get(
      `${baseUrl}/${agent_id}/terminal-defaults/`,
    );
    return data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
