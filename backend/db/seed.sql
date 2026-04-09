-- ============================================
-- WINE CATALOG SEED DATA (30 wines)
-- ============================================
-- Includes 6 "Chateau Demo" wines for Brand Concierge testing
-- Mix of reds, whites, rosé, sparkling, dessert

-- ============================================
-- CHATEAU DEMO (Brand Concierge test wines)
-- ============================================

INSERT OR REPLACE INTO wines (id, name, brand, wine_type, varietal, region, vintage, body, sweetness, acidity, tannin, alcohol_pct, price, description, tasting_notes, flavor_profile, food_pairings, occasions, image_url, shop_link, in_stock, staff_pick) VALUES
('cd-cab-2019', 'Chateau Demo Reserve Cabernet Sauvignon', 'Chateau Demo', 'red', 'cabernet-sauvignon', 'napa-valley', 2019, 'full', 'dry', 'medium', 'high', 14.5, 65.00, 'Our flagship Cabernet, aged 18 months in French oak. Dark fruit, structured tannins, and a long, elegant finish.', 'Blackcurrant, dark cherry, cedar, vanilla, and a hint of tobacco. Firm but polished tannins lead to a lengthy finish.', '["berry","cherry","blackberry","vanilla","pepper"]', '["steak","lamb","cheese"]', '["dinner-party","gift"]', NULL, NULL, 1, 1),

('cd-chard-2021', 'Chateau Demo Estate Chardonnay', 'Chateau Demo', 'white', 'chardonnay', 'napa-valley', 2021, 'medium', 'dry', 'medium', 'low', 13.5, 38.00, 'Barrel-fermented Chardonnay with a creamy texture and balanced acidity. Golden apple, vanilla, and a touch of brioche.', 'Golden apple, pear, vanilla bean, and toasted almond. Creamy mouthfeel with bright citrus on the finish.', '["vanilla","caramel","citrus","peach"]', '["poultry","seafood","pasta"]', '["dinner-party","date-night"]', NULL, NULL, 1, 0),

('cd-pinot-2020', 'Chateau Demo Pinot Noir', 'Chateau Demo', 'red', 'pinot-noir', 'napa-valley', 2020, 'medium', 'dry', 'high', 'low', 13.8, 52.00, 'Silky and aromatic Pinot Noir with bright red fruit and earthy undertones. Elegant and food-friendly.', 'Red cherry, raspberry, dried rose petals, and forest floor. Silky tannins with vibrant acidity.', '["cherry","berry","floral","earthy"]', '["salmon","poultry","mushroom"]', '["date-night","dinner-party"]', NULL, NULL, 1, 1),

('cd-rose-2022', 'Chateau Demo Provence-Style Rosé', 'Chateau Demo', 'rose', 'grenache', 'napa-valley', 2022, 'light', 'dry', 'high', 'low', 12.5, 24.00, 'Pale salmon-pink rosé with fresh strawberry and citrus notes. Dry, crisp, and perfect for warm evenings.', 'Strawberry, watermelon, white peach, and a hint of dried herb. Clean and refreshing finish.', '["berry","citrus","floral"]', '["salad","seafood","charcuterie"]', '["casual","date-night"]', NULL, NULL, 1, 0),

('cd-sparkle-nv', 'Chateau Demo Brut Sparkling', 'Chateau Demo', 'sparkling', 'champagne-blend', 'napa-valley', NULL, 'light', 'dry', 'high', 'low', 12.0, 42.00, 'Traditional method sparkling wine with fine persistent bubbles. Bright citrus and toasted brioche notes.', 'Green apple, lemon zest, brioche, and almond. Fine mousse with a crisp, dry finish.', '["citrus","green-apple","vanilla"]', '["shellfish","cheese","fruit"]', '["celebration","gift"]', NULL, NULL, 1, 0),

('cd-dessert-2018', 'Chateau Demo Late Harvest Riesling', 'Chateau Demo', 'dessert', 'riesling', 'napa-valley', 2018, 'medium', 'sweet', 'high', 'low', 10.5, 35.00, 'Luscious late harvest Riesling with concentrated stone fruit and honey. Balanced by bright acidity.', 'Apricot, honey, candied ginger, and orange blossom. Rich sweetness balanced by racy acidity.', '["tropical","peach","floral"]', '["dessert","fruit","cheese"]', '["gift","dinner-party"]', NULL, NULL, 1, 0);

-- ============================================
-- MERCHANT WINES — REDS
-- ============================================

INSERT OR REPLACE INTO wines (id, name, brand, wine_type, varietal, region, vintage, body, sweetness, acidity, tannin, alcohol_pct, price, description, tasting_notes, flavor_profile, food_pairings, occasions, image_url, shop_link, in_stock, staff_pick) VALUES
('m-cab-opus', 'Silver Oak Cabernet Sauvignon', 'Silver Oak', 'red', 'cabernet-sauvignon', 'napa-valley', 2019, 'full', 'dry', 'medium', 'high', 14.8, 85.00, 'Iconic Napa Cabernet with deep concentration, velvety tannins, and remarkable aging potential.', 'Blackberry, cassis, dark chocolate, espresso, and cedar. Velvety tannins with an exceptionally long finish.', '["blackberry","cherry","chocolate","coffee","vanilla"]', '["steak","lamb"]', '["gift","dinner-party"]', NULL, NULL, 1, 1),

('m-merlot-duckhorn', 'Duckhorn Merlot', 'Duckhorn Vineyards', 'red', 'merlot', 'napa-valley', 2020, 'full', 'dry', 'medium', 'medium', 14.5, 55.00, 'Plush and polished Merlot with layers of dark fruit and supple tannins.', 'Plum, black cherry, mocha, and baking spice. Smooth, round mouthfeel with integrated oak.', '["cherry","plum","chocolate","spice"]', '["steak","pork","pasta"]', '["dinner-party","casual"]', NULL, NULL, 1, 0),

('m-pinot-oregon', 'Domaine Drouhin Pinot Noir', 'Domaine Drouhin', 'red', 'pinot-noir', 'willamette-valley', 2020, 'medium', 'dry', 'high', 'low', 13.5, 45.00, 'Oregon Pinot Noir with Burgundian elegance. Bright fruit, earthy complexity, and silky texture.', 'Red cherry, cranberry, mushroom, and dried herbs. Silky texture with a long, savory finish.', '["cherry","berry","earthy","herbal"]', '["salmon","poultry","mushroom"]', '["date-night","dinner-party"]', NULL, NULL, 1, 1),

('m-syrah-rhone', 'E. Guigal Côtes du Rhône', 'E. Guigal', 'red', 'syrah', 'rhone-valley', 2021, 'medium', 'dry', 'medium', 'medium', 14.0, 18.00, 'Classic Rhône blend with dark fruit, black pepper, and Mediterranean herbs. Outstanding value.', 'Blackberry, black pepper, lavender, and garrigue herbs. Medium body with a spicy, savory finish.', '["blackberry","pepper","spice","herbal"]', '["lamb","pork","charcuterie"]', '["casual","cooking"]', NULL, NULL, 1, 0),

('m-malbec-mendoza', 'Catena Malbec', 'Bodega Catena Zapata', 'red', 'malbec', 'mendoza', 2021, 'full', 'dry', 'medium', 'medium', 14.0, 22.00, 'High-altitude Argentine Malbec with intense dark fruit, violet notes, and smooth tannins.', 'Dark plum, blackberry, violet, cocoa, and a hint of vanilla. Plush tannins with a juicy finish.', '["plum","blackberry","chocolate","floral"]', '["steak","lamb","pizza"]', '["casual","dinner-party"]', NULL, NULL, 1, 0),

('m-zinfandel-ridge', 'Ridge Lytton Springs Zinfandel', 'Ridge Vineyards', 'red', 'zinfandel', 'sonoma', 2020, 'full', 'dry', 'medium', 'medium', 14.9, 42.00, 'Bold Sonoma Zinfandel blend with explosive fruit, baking spice, and brambly character.', 'Raspberry, boysenberry, black pepper, clove, and chocolate. Rich and jammy with a long spicy finish.', '["berry","cherry","pepper","spice","chocolate"]', '["steak","pork","pizza","charcuterie"]', '["casual","dinner-party"]', NULL, NULL, 1, 0),

('m-sangiovese-tuscany', 'Antinori Tignanello', 'Antinori', 'red', 'sangiovese', 'tuscany', 2019, 'full', 'dry', 'high', 'high', 14.0, 95.00, 'Super Tuscan icon. Complex layers of cherry, leather, and tobacco with firm, refined tannins.', 'Sour cherry, plum, leather, tobacco, and dried herbs. Firm structured tannins with excellent length.', '["cherry","earthy","pepper","herbal"]', '["pasta","lamb","cheese"]', '["gift","dinner-party"]', NULL, NULL, 1, 1),

('m-tempranillo-rioja', 'La Rioja Alta Viña Ardanza Reserva', 'La Rioja Alta', 'red', 'tempranillo', 'rioja', 2016, 'medium', 'dry', 'medium', 'medium', 13.5, 32.00, 'Classic Rioja Reserva with mature fruit, vanilla oak, and a silky, lingering finish.', 'Dried cherry, fig, vanilla, cinnamon, and leather. Smooth, integrated tannins with a warm finish.', '["cherry","vanilla","spice","earthy"]', '["lamb","pork","charcuterie","cheese"]', '["dinner-party","casual"]', NULL, NULL, 1, 0);

-- ============================================
-- MERCHANT WINES — WHITES
-- ============================================

INSERT OR REPLACE INTO wines (id, name, brand, wine_type, varietal, region, vintage, body, sweetness, acidity, tannin, alcohol_pct, price, description, tasting_notes, flavor_profile, food_pairings, occasions, image_url, shop_link, in_stock, staff_pick) VALUES
('m-sauv-blanc-nz', 'Cloudy Bay Sauvignon Blanc', 'Cloudy Bay', 'white', 'sauvignon-blanc', 'marlborough', 2023, 'light', 'dry', 'high', 'low', 13.0, 26.00, 'Benchmark Marlborough Sauvignon Blanc. Explosive citrus and tropical fruit with vibrant acidity.', 'Passionfruit, grapefruit, lime zest, and fresh-cut grass. Bright acidity with a clean, lingering finish.', '["citrus","grapefruit","tropical"]', '["seafood","salad","shellfish"]', '["casual","date-night"]', NULL, NULL, 1, 1),

('m-chard-burgundy', 'Louis Jadot Pouilly-Fuissé', 'Louis Jadot', 'white', 'chardonnay', 'burgundy', 2021, 'medium', 'dry', 'high', 'low', 13.0, 35.00, 'Elegant Burgundian Chardonnay with mineral-driven precision, stone fruit, and subtle oak.', 'White peach, citrus, toasted hazelnut, and wet stone. Balanced between richness and mineral tension.', '["peach","citrus","mineral","vanilla"]', '["poultry","seafood","pasta","cheese"]', '["dinner-party","date-night"]', NULL, NULL, 1, 0),

('m-riesling-mosel', 'Dr. Loosen Blue Slate Riesling Kabinett', 'Dr. Loosen', 'white', 'riesling', 'mosel', 2022, 'light', 'off-dry', 'high', 'low', 8.5, 18.00, 'Delicate Mosel Riesling with floral aromatics, green apple, and a perfect balance of sweetness and acidity.', 'Green apple, white peach, honeysuckle, and wet slate. Off-dry with electric acidity and a long mineral finish.', '["citrus","green-apple","floral","mineral"]', '["seafood","poultry","vegetables"]', '["casual","date-night"]', NULL, NULL, 1, 0),

('m-pinot-grigio-italy', 'Santa Margherita Pinot Grigio', 'Santa Margherita', 'white', 'pinot-grigio', 'veneto', 2023, 'light', 'dry', 'medium', 'low', 12.5, 22.00, 'Clean and crisp Italian Pinot Grigio. Citrus and pear with a refreshing, easy-drinking style.', 'Lemon, pear, green apple, and white flowers. Light and crisp with a clean finish.', '["citrus","green-apple","floral"]', '["seafood","salad","pasta"]', '["casual"]', NULL, NULL, 1, 0),

('m-gewurz-alsace', 'Trimbach Gewurztraminer', 'Trimbach', 'white', 'gewurztraminer', 'loire-valley', 2021, 'medium', 'off-dry', 'medium', 'low', 14.0, 28.00, 'Aromatic Alsatian Gewurztraminer with lychee, rose petal, and ginger spice. Rich and perfumed.', 'Lychee, rose petal, ginger, and Turkish delight. Rich and viscous with exotic spice on the finish.', '["tropical","floral","spice"]', '["poultry","seafood","vegetables"]', '["dinner-party","date-night"]', NULL, NULL, 1, 0),

('m-viognier-rhone', 'Yalumba The Virgilius Viognier', 'Yalumba', 'white', 'viognier', 'barossa-valley', 2021, 'full', 'dry', 'medium', 'low', 13.5, 45.00, 'Luxurious Australian Viognier with peach, apricot, and honeysuckle. Full body with a silky texture.', 'Apricot, white peach, honeysuckle, and ginger. Full and textured with a creamy, lingering finish.', '["peach","tropical","floral","vanilla"]', '["poultry","seafood","pasta"]', '["dinner-party","gift"]', NULL, NULL, 1, 0);

-- ============================================
-- MERCHANT WINES — ROSÉ
-- ============================================

INSERT OR REPLACE INTO wines (id, name, brand, wine_type, varietal, region, vintage, body, sweetness, acidity, tannin, alcohol_pct, price, description, tasting_notes, flavor_profile, food_pairings, occasions, image_url, shop_link, in_stock, staff_pick) VALUES
('m-rose-provence', 'Whispering Angel Rosé', 'Caves d''Esclans', 'rose', 'grenache', 'rhone-valley', 2023, 'light', 'dry', 'high', 'low', 13.0, 24.00, 'The benchmark Provence rosé. Pale pink, bone dry, with delicate fruit and mineral freshness.', 'Strawberry, white peach, citrus blossom, and sea salt. Bone dry with a crisp, mineral finish.', '["berry","citrus","floral","mineral"]', '["seafood","salad","shellfish"]', '["casual","date-night","celebration"]', NULL, NULL, 1, 1),

('m-rose-spain', 'Muga Rosado', 'Bodegas Muga', 'rose', 'grenache', 'rioja', 2022, 'medium', 'dry', 'medium', 'low', 13.5, 16.00, 'Deeper-hued Spanish rosé with more body and ripe red fruit. Great with food.', 'Raspberry, pomegranate, dried herbs, and a hint of spice. Medium body with a savory finish.', '["berry","cherry","herbal","spice"]', '["charcuterie","pasta","pork"]', '["casual","cooking"]', NULL, NULL, 1, 0);

-- ============================================
-- MERCHANT WINES — SPARKLING
-- ============================================

INSERT OR REPLACE INTO wines (id, name, brand, wine_type, varietal, region, vintage, body, sweetness, acidity, tannin, alcohol_pct, price, description, tasting_notes, flavor_profile, food_pairings, occasions, image_url, shop_link, in_stock, staff_pick) VALUES
('m-champagne-veuve', 'Veuve Clicquot Yellow Label Brut', 'Veuve Clicquot', 'sparkling', 'champagne-blend', 'champagne', NULL, 'medium', 'dry', 'high', 'low', 12.0, 55.00, 'Iconic Champagne with biscuity richness, bright fruit, and fine persistent bubbles.', 'Brioche, yellow apple, citrus, and toasted almond. Creamy mousse with a long, toasty finish.', '["citrus","vanilla","caramel"]', '["shellfish","cheese","fruit"]', '["celebration","gift","dinner-party"]', NULL, NULL, 1, 1),

('m-prosecco-italy', 'La Marca Prosecco', 'La Marca', 'sparkling', 'prosecco-blend', 'veneto', NULL, 'light', 'off-dry', 'medium', 'low', 11.0, 15.00, 'Fresh and approachable Prosecco with green apple, white peach, and delicate bubbles.', 'Green apple, white peach, honeydew, and white flowers. Light and refreshing with gentle sweetness.', '["citrus","green-apple","tropical","floral"]', '["fruit","shellfish","salad"]', '["casual","celebration"]', NULL, NULL, 1, 0);

-- ============================================
-- MERCHANT WINES — DESSERT
-- ============================================

INSERT OR REPLACE INTO wines (id, name, brand, wine_type, varietal, region, vintage, body, sweetness, acidity, tannin, alcohol_pct, price, description, tasting_notes, flavor_profile, food_pairings, occasions, image_url, shop_link, in_stock, staff_pick) VALUES
('m-sauternes-yquem', 'Château d''Yquem Sauternes', 'Château d''Yquem', 'dessert', 'white-blend', 'bordeaux', 2017, 'full', 'sweet', 'high', 'low', 14.0, 350.00, 'The ultimate dessert wine. Layers of honey, saffron, and tropical fruit with incredible complexity and endless finish.', 'Honey, saffron, apricot, candied citrus peel, and crème brûlée. Unctuous texture with piercing acidity.', '["tropical","peach","vanilla","caramel"]', '["dessert","cheese","fruit"]', '["gift","celebration","dinner-party"]', NULL, NULL, 1, 1),

('m-moscato-asti', 'Vietti Moscato d''Asti', 'Vietti', 'dessert', 'moscato', 'piedmont', 2023, 'light', 'sweet', 'medium', 'low', 5.5, 18.00, 'Delightfully sweet and low-alcohol Moscato with peach, apricot, and orange blossom.', 'Peach, apricot, orange blossom, and honey. Gently fizzy with a clean, sweet finish.', '["peach","tropical","floral"]', '["dessert","fruit"]', '["casual","celebration"]', NULL, NULL, 1, 0);
