export const GUIDE_PANEL_ORDER = [
  'wine-basics',
  'sparkling-guide',
  'food-pairing',
  'serving-tips',
  'glossary'
] as const;

export type GuidePanelId = (typeof GUIDE_PANEL_ORDER)[number];

export interface EducationEntry {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
}

export interface EducationAccordionItem {
  id: string;
  title: string;
  description: string;
}

export interface EducationSection {
  id: string;
  title: string;
  intro?: string;
  bullets?: string[];
  entries?: EducationEntry[];
  accordionItems?: EducationAccordionItem[];
  note?: string;
}

export interface EducationPanelContent {
  id: GuidePanelId;
  title: string;
  intro: string;
  sections: EducationSection[];
}

export const WINE_EDUCATION_PANELS: Record<GuidePanelId, EducationPanelContent> = {
  'wine-basics': {
    id: 'wine-basics',
    title: 'Wine Basics',
    intro: 'These are the core tasting terms used throughout the sommelier flow and recommendation cards.',
    sections: [
      {
        id: 'wine-basics-key-terms',
        title: 'Key Terms',
        entries: [
          {
            id: 'body',
            title: 'Body',
            description: 'Body is the weight or texture of the wine on your palate.',
            bullets: [
              'Light-bodied wines feel brisk and delicate.',
              'Medium-bodied wines feel balanced and rounded.',
              'Full-bodied wines feel richer and more textured.',
              'White wines can be full-bodied too, especially richer Chardonnay styles.'
            ]
          },
          {
            id: 'dry-sweet',
            title: 'Dry / Sweet',
            description: 'Dryness is about residual sugar, not acidity.',
            bullets: [
              'Dry wines taste not-sweet.',
              'Off-Dry wines carry a gentle touch of sweetness.',
              'Sweet wines have noticeable sugar and a softer finish.'
            ]
          },
          {
            id: 'acidity',
            title: 'Acidity',
            description: 'Acidity gives wine freshness, lift, and a crisp or bright feel.'
          },
          {
            id: 'tannins',
            title: 'Tannins',
            description: 'Tannins create a drying grip on the mouth and are most common in red wines.'
          },
          {
            id: 'oak',
            title: 'Oak vs Unoaked',
            description: 'Oak can bring toast, vanilla, spice, and a richer texture. Unoaked wines usually feel fresher, crisper, and more fruit-driven.'
          },
          {
            id: 'finish',
            title: 'Finish',
            description: 'Finish is how long the flavor lingers after a sip.'
          }
        ]
      }
    ]
  },
  'sparkling-guide': {
    id: 'sparkling-guide',
    title: 'Sparkling Guide',
    intro: 'Sparkling is usually best chosen by style, dryness, flavor profile, occasion, and price. Body is usually secondary.',
    sections: [
      {
        id: 'sparkling-styles',
        title: 'Sparkling Styles',
        entries: [
          {
            id: 'champagne',
            title: 'Champagne',
            description: 'Structured and refined, often with citrus, apple, mineral, or toast notes.'
          },
          {
            id: 'prosecco',
            title: 'Prosecco',
            description: 'Fresh, fruit-forward, and easygoing, often showing apple, pear, or soft floral notes.'
          },
          {
            id: 'cava',
            title: 'Cava',
            description: 'Typically dry, crisp, and mineral-driven with a more savory edge.'
          },
          {
            id: 'cremant',
            title: 'Cremant',
            description: 'Traditional-method sparkling from France outside Champagne, often polished and food-friendly.'
          },
          {
            id: 'blanc-de-blancs',
            title: 'Blanc de Blancs',
            description: 'White sparkling made from white grapes, often bright, citrusy, and precise.'
          },
          {
            id: 'rose',
            title: 'Rosé',
            description: 'Sparkling with berry fruit, floral lift, and a pink-fruit profile.'
          },
          {
            id: 'moscato',
            title: 'Moscato',
            description: 'Fragrant, fruit-forward sparkling that often leans sweeter and softer.'
          }
        ]
      },
      {
        id: 'sparkling-sweetness',
        title: 'Sweetness Ladder',
        bullets: [
          'Brut Nature / Extra Brut: very dry',
          'Brut: dry',
          'Extra Dry: slightly sweeter than Brut',
          'Dry / Sec: sweeter',
          'Demi-Sec / Doux: sweet'
        ],
        note: 'Style does not automatically determine sweetness. For example, Champagne can range from very dry to sweet.'
      },
      {
        id: 'sparkling-flavors',
        title: 'Sparkling Flavors',
        bullets: [
          'Citrus / Mineral',
          'Apple / Pear',
          'Soft Fruit & Floral',
          'Brioche / Toast',
          'Berry / Rosé',
          'Sweet / Fruity'
        ]
      },
      {
        id: 'sparkling-priorities',
        title: 'What Matters Most',
        bullets: [
          'Style usually shapes the overall feel first.',
          'Dry / Sweet tells you how crisp or soft the wine will taste.',
          'Flavor profile helps narrow the final match.',
          'Occasion and price often matter as much as tasting notes.'
        ]
      }
    ]
  },
  'food-pairing': {
    id: 'food-pairing',
    title: 'Food Pairing',
    intro: 'Start with the dominant element of the dish, especially the sauce, seasoning, or preparation.',
    sections: [
      {
        id: 'pairing-categories',
        title: 'Pairing Guide',
        entries: [
          {
            id: 'red-meat',
            title: 'Red Meat',
            description: 'Steak, lamb, burgers, and braises usually want drier reds with more structure or fuller body.'
          },
          {
            id: 'poultry',
            title: 'Poultry',
            description: 'Chicken and pork can swing white or red depending on whether the preparation is light, creamy, roasted, or sweet-spiced.'
          },
          {
            id: 'seafood',
            title: 'Seafood',
            description: 'Seafood is one of the most preparation-driven categories.',
            bullets: [
              'Shellfish / Oysters',
              'Mild White Fish',
              'Lobster / Cream Sauce',
              'Salmon / Tuna'
            ]
          },
          {
            id: 'pasta',
            title: 'Pasta',
            description: 'Tomato sauces usually lean red, while cream, pesto, and lighter sauces often move toward white.'
          },
          {
            id: 'cheese',
            title: 'Cheese',
            description: 'Cheese boards can mix styles, which is why the flow allows a broader or mixed-board recommendation.'
          },
          {
            id: 'spicy-food',
            title: 'Spicy Food',
            description: 'A little sweetness can help soften heat, especially with spicy glazes or dishes with sweet-spicy sauces.'
          },
          {
            id: 'dessert',
            title: 'Dessert',
            description: 'Dessert wines work best when the wine is at least as sweet as the dessert itself.'
          }
        ]
      },
      {
        id: 'pairing-principles',
        title: 'Pairing Principles',
        bullets: [
          'Richer foods usually pair better with fuller wines.',
          'Lighter foods usually pair better with lighter wines.',
          'Acidity helps cut richness and refresh the palate.',
          'Dessert wine should meet or exceed the sweetness of dessert.'
        ]
      }
    ]
  },
  'serving-tips': {
    id: 'serving-tips',
    title: 'Serving Tips',
    intro: 'A few practical serving choices can make the wine taste noticeably better.',
    sections: [
      {
        id: 'serving-temperatures',
        title: 'Serving Temperatures',
        bullets: [
          'Sparkling: very chilled',
          'White: chilled',
          'Lighter reds: slightly cool',
          'Fuller reds: closer to cellar temperature'
        ]
      },
      {
        id: 'before-you-pour',
        title: 'Before You Pour',
        entries: [
          {
            id: 'decanting',
            title: 'When to Decant',
            description: 'Younger, fuller reds and wines with more structure often benefit from air. Most crisp whites and sparkling wines do not need decanting.'
          },
          {
            id: 'sparkling-chill',
            title: 'How Long to Chill Sparkling',
            description: 'Give sparkling enough time to get fully cold before serving. A short chill is rarely enough for the best texture and mousse.'
          }
        ]
      },
      {
        id: 'after-opening',
        title: 'After Opening',
        bullets: [
          'Sparkling is best within 1-3 days with a proper stopper.',
          'Most whites and roses show best for about 3-5 days refrigerated.',
          'Most reds hold for about 2-4 days, depending on structure and storage.'
        ]
      },
      {
        id: 'storage',
        title: 'Storage Basics',
        bullets: [
          'Keep bottles away from heat and direct sun.',
          'Store longer-term bottles in a cool, steady environment.',
          'Re-cork opened bottles and refrigerate them to slow oxidation.'
        ]
      }
    ]
  },
  glossary: {
    id: 'glossary',
    title: 'Glossary',
    intro: 'Quick definitions for the terms you will see in the flow, recommendations, and wine labels.',
    sections: [
      {
        id: 'glossary-terms',
        title: 'Quick Reference',
        accordionItems: [
          {
            id: 'varietal',
            title: 'Varietal',
            description: 'The grape variety used in the wine, or a wine named after that grape.'
          },
          {
            id: 'vintage',
            title: 'Vintage',
            description: 'The year the grapes were harvested.'
          },
          {
            id: 'terroir',
            title: 'Terroir',
            description: 'The combination of place factors like soil, climate, elevation, and site that shape wine character.'
          },
          {
            id: 'tannin',
            title: 'Tannin',
            description: 'The drying, gripping sensation you often feel in red wine.'
          },
          {
            id: 'acidity',
            title: 'Acidity',
            description: 'The fresh, bright, mouthwatering quality that gives wine lift.'
          },
          {
            id: 'body',
            title: 'Body',
            description: 'How light, medium, or full the wine feels in the mouth.'
          },
          {
            id: 'dry',
            title: 'Dry',
            description: 'A wine with little to no noticeable residual sugar.'
          },
          {
            id: 'off-dry',
            title: 'Off-Dry',
            description: 'A wine with a small but noticeable touch of sweetness.'
          },
          {
            id: 'minerality',
            title: 'Minerality',
            description: 'A tasting term often used for chalky, stony, saline, or shell-like impressions.'
          },
          {
            id: 'finish',
            title: 'Finish',
            description: 'How long the flavor lingers after a sip.'
          },
          {
            id: 'lees',
            title: 'Lees',
            description: 'Spent yeast cells that can add texture and bread or brioche notes during aging.'
          },
          {
            id: 'brut',
            title: 'Brut',
            description: 'A dry sparkling category, though not the driest possible one.'
          },
          {
            id: 'blanc-de-blancs',
            title: 'Blanc de Blancs',
            description: 'Sparkling wine made from white grapes only, often Chardonnay.'
          },
          {
            id: 'blanc-de-noirs',
            title: 'Blanc de Noirs',
            description: 'Sparkling wine made from black-skinned grapes that is pressed gently so the wine stays white.'
          }
        ]
      }
    ]
  }
};
