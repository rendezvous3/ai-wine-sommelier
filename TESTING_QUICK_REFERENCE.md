# Stream-First Testing - Quick Reference Card

## Local Terminal Note

On this Mac, `node`, `npm`, `npx`, `wrangler`, and `pywrangler` may be missing in a fresh terminal until `nvm` is activated. Before running any Node/Wrangler command in a new terminal, run:

```bash
nvm use --lts
```

## 🚀 Quick Start

```bash
# Terminal 1: Start backend
cd backend && wrangler dev

# Terminal 2: Start frontend
cd client && npm run dev

# Browser: Clear storage
localStorage.clear()
```

## 📊 Console Monitoring

Paste this in browser console to see API calls:
```javascript
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return originalFetch.apply(this, args).then(async (response) => {
    if (args[0].includes('/stream')) console.log('🌊 STREAM');
    if (args[0].includes('/intent')) console.log('🧠 INTENT');
    if (args[0].includes('/recommendations')) console.log('🎯 RECOMMENDATIONS');
    return response;
  });
};
```

## ✅ Essential Test Cases

### 1. Complete Query (RECOMMEND)
```
Input: "uplifting sativa flower"
Expected: 🌊 → 🧠 → 🎯 → Products shown
```

### 2. Incomplete Query (Clarification)
```
Input: "I want edibles"
Expected: 🌊 → Asks about effects → No 🧠 or 🎯
```

### 3. General Question (No CODEX)
```
Input: "What are your hours?"
Expected: 🌊 only → Direct answer
```

### 4. Product Question (PRODUCT_LOOKUP)
```
Input: "Tell me about Gelato Cake"
Expected: 🌊 → 🔍 → 🌊 → Product card shown
```

### 5. Multi-Turn
```
Turn 1: "I want something"
Turn 2: "sleepy"
Turn 3: "edibles"
Expected: Clarifications → CODEX → Products
```

## ♿ Accessibility Smoke Test (Required)

1. Keyboard only: open widget, send message, open panel, close with `Escape`, verify focus return.
2. Screen reader: verify new chat message announcements and panel dialog title announcement.
3. Feedback form: verify error and success notices are announced.
4. Reduced motion: enable system reduced motion and confirm animations are minimized.
5. Zoom/reflow: test 200% zoom and mobile width without losing required controls.

## 🔍 CODEX Patterns

**RECOMMEND:**
- "I completely understand what you're looking for"
- "Let me check what we have that matches your preferences"
- "I'm pulling up products that fit your criteria"
- "Checking our inventory based on what you described"

**PRODUCT_LOOKUP:**
- "Let me look up [product] for you"
- "I'll pull up the details on [product]"

## 🎯 2/3 Rule

Query needs **2 of 3** elements for RECOMMEND:

| Element | Examples |
|---------|----------|
| Intent | "looking for", "recommend", "I want" |
| Effect | "uplifting", "relaxing", "sleepy", "strong" |
| Category | "flower", "edibles", "vapes" |

**Examples:**
- ✅ "uplifting flower" (Effect + Category)
- ✅ "recommend something relaxing" (Intent + Effect)
- ❌ "I want edibles" (Intent + Category, missing Effect)

## 🐛 Quick Debugging

**No CODEX emitted?**
→ Check Network tab → /stream response → Look for cue phrase

**Wrong filters extracted?**
→ Check Network tab → /intent response → Verify filters

**No products shown?**
→ Check Network tab → /recommendations response → Check if empty

**Product lookup fails?**
→ Check Console → productName extracted → Check /product-lookup response

## 📋 Pass/Fail Checklist

- [ ] Complete query → Products shown
- [ ] Incomplete query → Clarification asked
- [ ] General question → Direct answer
- [ ] Product question → Product card shown
- [ ] Multi-turn → Flows naturally
- [ ] No console errors
- [ ] No empty bubbles
- [ ] No duplicate messages
- [ ] Shimmer clears after products load
- [ ] Persistence works after refresh

## ⚡ Performance Targets

- First token: **< 500ms**
- Complete recommendation flow: **< 3s**
- Product lookup flow: **< 2.5s**

## 🔧 Common Fixes

**Stream won't start:**
```bash
# Restart backend
cd backend && wrangler dev
```

**Frontend errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules && npm install
```

**CODEX not detected:**
```
Check CODEX_PATTERNS in client/src/Widget.svelte
```

**No products in database:**
```bash
# Current live-ish lane manual full refresh
cd vectorizer/src
./preset_sync.sh all-products ALL products-prod none 5

# QA lane upload
cd /Users/bojanjovanovic/Desktop/Svelte/AiChatBot/vectorizer/src
python vectorize.py -x products-qa --category FLOWER --limit 50 --upload

# Full pull dry run
python vectorize.py -x products-test --category EDIBLES --limit none

# Exclude known low stock
python vectorize.py -x products-test --category EDIBLES --limit 100 --min-quantity 5

# Preview stale cleanup on QA
python reconcile_stale.py -x products-qa --stale-hours 48 --dry-run
```

## 📝 Test Data

**Good test queries:**
- "uplifting sativa flower"
- "recommend relaxing edibles"
- "I want something for sleep"
- "show me strong concentrates"
- "Tell me about Gelato Cake"
- "What are your hours?"

**Edge cases:**
- "" (empty)
- "I want something" (very incomplete)
- "Tell me about Gelato" (ambiguous)
- Very long query (100+ words)

## 🎓 What Success Looks Like

1. **Stream-First:** Every query streams immediately
2. **CODEX Accuracy:** 100% detection rate
3. **Guided Flow:** Natural clarification questions
4. **No Hallucination:** Only shows real products
5. **Error Recovery:** Graceful error messages
6. **Persistence:** Works after refresh
7. **Performance:** Fast, responsive, no delays
