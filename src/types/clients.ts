export interface Client {
  id: number;
  name: string;
}

export interface ClientWithSites {
  id: number;
  name: string;
  sites: Site[];
}

export interface Site {
  id: number;
  name: string;
}
