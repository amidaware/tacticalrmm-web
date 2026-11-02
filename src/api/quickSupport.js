// BlueCloud Quick Support queue - see /rmm/api/tacticalrmm/core/quick_support.py
import axios from "axios";

const base = "/core/quick-support";

export async function fetchQuickSupportQueue() {
  const { data } = await axios.get(`${base}/sessions/`);
  return data;
}

export async function connectQuickSupport(node, mode = "desktop") {
  const { data } = await axios.post(
    `${base}/sessions/${encodeURIComponent(node)}/connect/`,
    { mode },
  );
  return data;
}

export async function releaseQuickSupport(node) {
  const { data } = await axios.post(
    `${base}/sessions/${encodeURIComponent(node)}/release/`,
  );
  return data;
}

export async function testQuickSupportTeams(url) {
  const { data } = await axios.post(`${base}/teams-test/`, { url });
  return data;
}
