import axios from "axios";

const baseUrl = "/netdevices";

export async function fetchNetworkDevices(params = {}) {
  const { data } = await axios.get(`${baseUrl}/`, { params });
  return data;
}

export async function saveNetworkDevice(payload) {
  const { data } = await axios.post(`${baseUrl}/`, payload);
  return data;
}

export async function editNetworkDevice(id, payload) {
  const { data } = await axios.put(`${baseUrl}/${id}/`, payload);
  return data;
}

export async function removeNetworkDevice(id) {
  const { data } = await axios.delete(`${baseUrl}/${id}/`);
  return data;
}

export async function connectNetworkDevice(id) {
  const { data } = await axios.post(`${baseUrl}/${id}/connect/`);
  return data;
}
