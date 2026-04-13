export type ProfileType = 'brand_concierge' | 'merchant_advisor';

export interface QuickStartSuggestion {
  label: string;
  prompt: string;
}

export interface ProfileFeatures {
  wineClub: boolean;
  corporateGifting: boolean;
  dealerLocator: boolean;
  leadCapture: boolean;
  crossBrandComparison: boolean;
}

export interface WineClubTier {
  name: string;
  bottles: number;
  frequency: string;
  priceRange: string;
}

export interface WineClubConfig {
  name: string;
  tiers: WineClubTier[];
  benefits: string[];
  joinUrl: string;
  contactEmail: string;
}

export interface GiftSet {
  name: string;
  description: string;
  price: number;
}

export interface GiftingConfig {
  contactEmail: string;
  contactPhone: string;
  minCorporateQuantity: number;
  giftSets: GiftSet[];
}

export interface BrandContent {
  shippingPolicy: string;
  returnPolicy: string;
  storeHours: string;
  dealerLocatorUrl: string;
  heritage: string;
}

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
  // Phase 0: Profile-aware UI
  guidedFlowType: 'brand' | 'merchant';
  welcomeMessage: string;
  quickStartSuggestions: QuickStartSuggestion[];
  features: ProfileFeatures;
  // Phase 2: Wine Club (Brand only)
  wineClubConfig?: WineClubConfig;
  // Phase 6: Corporate Gifting (Brand only)
  giftingConfig?: GiftingConfig;
  // Phase 9: Brand Content FAQ (Brand only)
  brandContent?: BrandContent;
}
