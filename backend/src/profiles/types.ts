export type ProfileType = 'brand_concierge' | 'merchant_advisor';

export interface DeploymentProfile {
  profileType: ProfileType;
  storeName: string;
  storeDescription: string;
  brandName?: string;
  allowCrossBrand: boolean;
  tone: string;
  catalogScope: string;
  greeting: string;
  persona: string;
  constraints: string;
}
