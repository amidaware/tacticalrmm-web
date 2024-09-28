/*
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
*/

import { User } from "@/types/accounts";
export interface SSOProvider {
  id: number;
  name: string;
  provider_id: string;
  client_id: string;
  secret: string;
  server_url: string;
}

export interface SSOAccount {
  uid: string;
  display: string;
  provider: string;
  last_login: string;
  date_joined: string;
}

export interface SSOUser extends User {
  social_accounts: SSOAccount[];
}
