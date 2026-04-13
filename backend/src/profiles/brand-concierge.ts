import type { DeploymentProfile } from './types';

export const brandConciergeProfile: DeploymentProfile = {
  profileType: 'brand_concierge',
  storeName: 'Chateau Demo',
  storeDescription: 'A boutique winery specializing in small-batch, handcrafted wines from Napa Valley.',
  brandName: 'Chateau Demo',
  allowCrossBrand: false,
  tone: 'premium, consultative, warm',
  catalogScope: 'Only wines from the Chateau Demo portfolio',
  greeting: "Welcome to Chateau Demo. I'm your personal wine concierge — how can I help you find the perfect bottle from our collection?",
  persona: `You represent Chateau Demo winery exclusively. You speak with the warmth and pride of someone who knows every vineyard row and barrel in the cellar. You recommend only wines from the Chateau Demo portfolio. If no ideal fit exists within the house catalog, recommend the nearest in-brand option and explain why it's a great alternative rather than suggesting wines from other producers.`,
  constraints: `- Only recommend wines where brand = "Chateau Demo"
- Never suggest wines from other producers or brands
- Reference house style, winemaker philosophy, and vineyard identity when relevant
- If the user asks for something outside the portfolio, acknowledge the gap honestly and offer the closest match from the house catalog`,

  // Profile-aware UI
  guidedFlowType: 'brand',
  welcomeMessage: "Welcome to Chateau Demo. I'm your personal wine concierge — whether you're exploring our collection, looking for the perfect gift, or curious about our wine club, I'm here to help.",
  quickStartSuggestions: [
    { label: 'Our Best Sellers', prompt: 'Show me your most popular wines' },
    { label: 'Gift Ideas', prompt: 'I need a wine gift' },
    { label: 'Food Pairing', prompt: 'What wine goes with grilled salmon?' },
    { label: 'Wine Club', prompt: 'Tell me about the wine club' },
    { label: 'Estate Wines', prompt: 'What makes your estate wines special?' },
    { label: 'Surprise Me', prompt: 'surprise me' },
  ],
  features: {
    wineClub: true,
    corporateGifting: true,
    dealerLocator: true,
    leadCapture: true,
    crossBrandComparison: false,
  },

  // Wine Club
  wineClubConfig: {
    name: 'Chateau Demo Wine Club',
    tiers: [
      { name: 'Discovery', bottles: 3, frequency: 'quarterly', priceRange: '$75–$120' },
      { name: 'Collector', bottles: 6, frequency: 'quarterly', priceRange: '$150–$240' },
    ],
    benefits: [
      'Priority access to limited releases',
      'Complimentary tastings for you and a guest',
      '15% discount on all purchases',
      'Invitations to member-only events',
    ],
    joinUrl: 'https://example.com/join-club',
    contactEmail: 'club@chateaudemo.com',
  },

  // Corporate Gifting
  giftingConfig: {
    contactEmail: 'cheers@chateaudemo.com',
    contactPhone: '707-967-3010',
    minCorporateQuantity: 6,
    giftSets: [
      { name: 'The Classic Duo', description: '2 bottles of our flagship wines', price: 120 },
      { name: 'The Explorer', description: '3 bottles across our portfolio', price: 175 },
      { name: 'The Connoisseur', description: '6-bottle curated collection', price: 350 },
    ],
  },

  // Brand Content FAQ
  brandContent: {
    shippingPolicy: 'We ship to 44 states. Ground shipping $12.95, free on orders over $200. 2-Day Air and Next-Day Air available.',
    returnPolicy: 'Alcoholic beverages can only be returned if the product is spoiled, deteriorated, or contaminated. Contact us at 707-967-3010.',
    storeHours: 'Tasting room open Thursday–Monday, 10am–5pm. Reservations recommended.',
    dealerLocatorUrl: 'https://example.com/find-retailer',
    heritage: 'Founded by the Wagner family with roots in Napa Valley dating back to the 1850s. Our winemaker crafts small-batch wines that reflect the unique terroir of our estate vineyards.',
  },
};
