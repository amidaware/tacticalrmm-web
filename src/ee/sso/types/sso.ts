export interface SSOProvider {
  id: number;
  name: string;
  provider_id: string;
  client_id: string;
  secret: string;
  server_url: string;
}
