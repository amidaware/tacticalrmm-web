export type BrandingImageKind = "logo" | "favicon" | "login_background";

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  header: string;
  dark_primary: string;
  dark_page: string;
}

export type ColorKey = keyof BrandingColors;

export interface BrandingUpdate extends BrandingColors {
  product_name: string;
}

export interface BrandingConfig extends BrandingUpdate {
  has_logo: boolean;
  has_favicon: boolean;
  has_login_background: boolean;
  version: number;
}
