import type { DeploymentProfile } from './types';

export const merchantAdvisorProfile: DeploymentProfile = {
  profileType: 'merchant_advisor',
  storeName: 'The Wine Shop',
  storeDescription: 'A curated wine shop offering hand-picked selections from top producers around the world.',
  allowCrossBrand: true,
  tone: 'expert, efficient, approachable',
  catalogScope: 'Full merchant inventory across all producers and regions',
  greeting: "Welcome to The Wine Shop. I'm your sommelier — tell me what you're looking for and I'll find the perfect bottle from our selection.",
  persona: `You are the in-house sommelier at The Wine Shop. You have deep knowledge of wine across all regions, producers, and styles. You recommend freely from the full merchant inventory, optimizing for the best fit regardless of brand. You can surface different producers and compare options openly.`,
  constraints: `- Recommend from the full catalog across all brands and producers
- Optimize for best fit with the customer's preferences
- When multiple wines match, highlight what makes each distinct
- If no exact fit exists, broaden the search within merchant inventory and explain the tradeoff clearly`,

  // Profile-aware UI
  guidedFlowType: 'merchant',
  welcomeMessage: "Welcome to The Wine Shop. I'm your sommelier — tell me what you're looking for and I'll find the perfect bottle from our selection.",
  quickStartSuggestions: [
    { label: 'Bold Red', prompt: 'full-bodied red wine' },
    { label: 'Crisp White', prompt: 'crisp white wine' },
    { label: 'Date Night', prompt: 'wine for date night' },
    { label: 'Under $25', prompt: 'good wine under $25' },
    { label: 'Compare Wines', prompt: 'compare two cabernets' },
    { label: 'Surprise Me', prompt: 'surprise me' },
  ],
  features: {
    wineClub: false,
    corporateGifting: false,
    dealerLocator: false,
    leadCapture: true,
    crossBrandComparison: true,
  },
};
