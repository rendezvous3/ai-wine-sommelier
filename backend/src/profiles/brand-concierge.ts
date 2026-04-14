import type { DeploymentProfile } from './types';

export const brandConciergeProfile: DeploymentProfile = {
  profileType: 'brand_concierge',
  storeName: 'ONEHOPE Wine',
  storeDescription: 'A Napa Valley winery crafting purpose-driven wines, tasting experiences, and gifts that give back.',
  brandName: 'ONEHOPE Wine',
  allowCrossBrand: false,
  tone: 'premium, consultative, warm',
  catalogScope: 'Only wines from the ONEHOPE Wine portfolio',
  greeting: "Welcome to ONEHOPE Wine. I'm your personal wine concierge — whether you're choosing a bottle for dinner, a celebration, or a gift, I'll help you find the right fit from our collection.",
  persona: `You represent ONEHOPE Wine exclusively. You speak with the warmth of a Napa hospitality host and the confidence of a house sommelier. You recommend only wines from the ONEHOPE Wine portfolio. If the user asks for something outside the portfolio, stay transparent and guide them to the closest in-house option rather than suggesting another producer.`,
  constraints: `- Only recommend wines where brand = "ONEHOPE Wine"
- Never suggest wines from other producers or brands
- Reference our Napa winery, hospitality experiences, and give-back mission naturally when relevant
- If the user asks for something outside the portfolio, acknowledge the gap honestly and offer the closest match from the house catalog`,

  guidedFlowType: 'brand',
  welcomeMessage: "Welcome to ONEHOPE Wine. I'm your personal wine concierge — whether you're exploring our wines, shopping for a gift, or planning a celebration, I'll help you find the right bottle from our collection.",
  quickStartSuggestions: [
    { label: 'Big Red for Steak', prompt: 'big red with steak' },
    { label: 'Crisp White for Seafood', prompt: 'crisp white for seafood' },
    { label: 'Rosé for Charcuterie', prompt: 'rosé for charcuterie' },
    { label: 'Celebration Bubbles', prompt: 'celebration bubbles' },
    { label: 'Sweet Wine for Dessert', prompt: 'sweet wine for dessert' },
    { label: 'Surprise Me', prompt: 'surprise me' },
  ],
  features: {
    wineClub: true,
    corporateGifting: true,
    dealerLocator: false,
    leadCapture: true,
    crossBrandComparison: false,
  },

  wineClubConfig: {
    name: 'ONEHOPE 20/20 Collective',
    tiers: [
      { name: 'Visionary', bottles: 24, frequency: 'spring/fall', priceRange: '$3,000 investment' },
      { name: 'Visionary Leader', bottles: 24, frequency: 'spring/fall', priceRange: '$5,000 investment' },
      { name: 'Visionary Partner', bottles: 38, frequency: 'spring/fall', priceRange: '$10,000 investment' },
    ],
    benefits: [
      'Free shipping on subscriptions and on orders over $99',
      'Savings on 6-bottle and 12-bottle purchases all year round',
      'Exclusive wine gifts and allocations',
      'Invitations to winery and culinary experiences',
    ],
    joinUrl: 'https://onehopewine.com/pages/20-20-collective',
    contactEmail: 'winery@onehopewine.com',
  },

  giftingConfig: {
    contactEmail: 'Gifting@onehopewine.com',
    contactPhone: '707-754-9156',
    minCorporateQuantity: 6,
    giftSets: [
      { name: 'Deluxe Celebration Gift Set', description: 'A ready-to-ship celebration set built around ONEHOPE gifting favorites.', price: 89 },
      { name: 'Artisan Gift Set', description: 'A premium curated set for client thank-yous and elevated personal gifting.', price: 92 },
      { name: 'Single Bottle Magnetic Gift Box', description: 'A polished presentation option for a single bottle gift.', price: 44 },
    ],
  },

  brandContent: {
    shippingPolicy: 'We offer nationwide delivery with adult signature requirements. Wine Club members receive free shipping on subscriptions and on additional orders over $99.',
    returnPolicy: 'If there is an issue with your shipment, our support team will help resolve it directly. Corporate gifting orders and delivery timing are coordinated with the ONEHOPE team.',
    storeHours: 'Visit our Napa Valley winery by reservation for guided tasting, food pairing, and private event experiences.',
    dealerLocatorUrl: 'https://onehopewine.com/',
    heritage: 'ONEHOPE was built in Napa Valley around the idea that every bottle can do good. The winery pairs hospitality, award-winning wine, and a give-back mission rooted in education, community, and impact.',
  },
};
