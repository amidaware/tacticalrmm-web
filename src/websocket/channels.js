import { getBaseUrl } from "@/boot/axios";

export function getWSUrl(path, token) {
  const url = getBaseUrl().split("://")[1];

  const proto =
    process.env.NODE_ENV === "production" || process.env.DOCKER_BUILD
      ? "wss"
      : "ws";
  return `${proto}://${url}/ws/${path}/?access_token=${token}`;
}
