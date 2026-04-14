import type { DeploymentProfile, ProfileType } from './types';
import { brandConciergeProfile } from './brand-concierge';
import { merchantAdvisorProfile } from './merchant-advisor';

const PROFILES: Record<ProfileType, DeploymentProfile> = {
  brand_concierge: brandConciergeProfile,
  merchant_advisor: merchantAdvisorProfile,
};

const PROFILE_ALIASES: Record<string, ProfileType> = {
  BRAND: 'brand_concierge',
  MERCHANT: 'merchant_advisor',
  brand: 'brand_concierge',
  merchant: 'merchant_advisor',
  brand_concierge: 'brand_concierge',
  merchant_advisor: 'merchant_advisor',
};

export function getProfile(profileType?: string): DeploymentProfile {
  if (profileType) {
    const normalizedProfileType = PROFILE_ALIASES[profileType.trim()] ?? PROFILE_ALIASES[profileType.trim().toUpperCase()];
    if (normalizedProfileType) {
      return PROFILES[normalizedProfileType];
    }
  }
  return PROFILES.merchant_advisor;
}

export type { DeploymentProfile, ProfileType, ProfileFeatures, QuickStartSuggestion, WineClubConfig, GiftingConfig, BrandContent };
