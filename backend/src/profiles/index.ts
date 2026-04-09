import type { DeploymentProfile, ProfileType } from './types';
import { brandConciergeProfile } from './brand-concierge';
import { merchantAdvisorProfile } from './merchant-advisor';

const PROFILES: Record<ProfileType, DeploymentProfile> = {
  brand_concierge: brandConciergeProfile,
  merchant_advisor: merchantAdvisorProfile,
};

export function getProfile(profileType?: string): DeploymentProfile {
  if (profileType && profileType in PROFILES) {
    return PROFILES[profileType as ProfileType];
  }
  return PROFILES.merchant_advisor;
}

export type { DeploymentProfile, ProfileType };
