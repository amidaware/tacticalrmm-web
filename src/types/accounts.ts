export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

export interface AuthToken {
  digest: string;
  created: string;
  expiry: string;
  user: string;
}
