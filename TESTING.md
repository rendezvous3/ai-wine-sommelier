# Stream-First Architecture - Testing & Verification Guide

## Overview

This document provides comprehensive testing scenarios for the Stream-First Architecture with CODEX cues implementation.

---

## Testing Setup

### Prerequisites
1. Backend deployed and running: `cd backend && wrangler dev`
2. Frontend running: `cd client && npm run dev`
3. Clear browser localStorage to start fresh: `localStorage.clear()`
4. Open browser DevTools Console to monitor CODEX detection

### Monitoring CODEX Detection

Add this snippet to browser console to monitor CODEX cues:
```javascript
// Monitor stream responses
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return originalFetch.apply(this, args).then(async (response) => {
    if (args[0].includes('/stream')) {
      console.log('🌊 STREAM API CALLED');
    }
    if (args[0].includes('/intent')) {
      console.log('🧠 INTENT API CALLED');
    }
    if (args[0].includes('/recommendations')) {
      console.log('🎯 RECOMMENDATIONS API CALLED');
    }
    return response;
  });
};
```

---

## Test Scenarios

### 1. Complete Query → CODEX:RECOMMEND

**Test Case 1.1: All 3 Elements Present**
```
Input: "uplifting sativa flower"

Expected Behavior:
✅ Stream responds immediately
✅ Stream emits: "I completely understand what you're looking for - uplifting sativa flower. Let me check what we have that matches your preferences."
✅ CODEX:RECOMMEND detected
✅ Shimmer "Looking for best matches..." appears
✅ Intent API called (filters: {category: "flower", type: "sativa", effects: ["uplifted", "energetic"]})
✅ Recommendations API called
✅ Products displayed with cards

Console Output:
🌊 STREAM API CALLED
🧠 INTENT API CALLED
🎯 RECOMMENDATIONS API CALLED

Message Timeline:
1. User: "uplifting sativa flower"
2. Assistant: "I completely understand what you're looking for - uplifting sativa flower. Let me check what we have that matches your preferences."
3. Assistant: [Product cards displayed]
```

**Test Case 1.2: 2/3 Elements (Intent + Effect)**
```
Input: "recommend something relaxing"

Expected Behavior:
✅ Stream emits CODEX:RECOMMEND
✅ Products shown (category filter will be null, search by effects)

Filters Extracted:
{
  effects: ["relaxed", "calm"],
  category: null
}
```

**Test Case 1.3: 2/3 Elements (Intent + Category)**
```
Input: "show me edibles"

Expected Behavior:
❌ Stream does NOT emit CODEX (missing effect)
✅ Stream asks: "I'd love to help you find some great edibles! With edibles we have some different options when it comes to desired effects: [lists effects]. How would you like to feel?"
✅ No Intent API called
✅ No Recommendations API called

Message Timeline:
1. User: "show me edibles"
2. Assistant: [Clarifying question about effects]
```

---

### 2. Incomplete Query → Clarifying Questions

**Test Case 2.1: Missing Effect (has Intent + Category)**
```
Input: "I want edibles"

Expected Behavior:
✅ Stream responds immediately
❌ No CODEX emitted
✅ Stream asks about desired effects
✅ No Intent or Recommendations API called

Response:
"I'd love to help you find some great edibles!

With edibles we have some different options when it comes to desired effects:

Uplifted and energized - great for daytime activities
Calm and relaxed - perfect for unwinding
Focused and clear-minded - ideal for creative work
Sleepy - or ready for a good night's sleep?

How would you like to feel?"

Follow-Up Test:
Input: "something energizing"

Expected:
✅ Stream emits CODEX:RECOMMEND
✅ Products shown (category: "edibles", effects: ["energetic"])
```

**Test Case 2.2: Missing Category (has Intent + Effect)**
```
Input: "something relaxing"

Expected Behavior:
✅ Stream asks about product category
❌ No CODEX emitted

Response:
"I can definitely help you find something relaxing!

We carry relaxing products in a few different forms:

Flower - classic experience, full spectrum of effects
Pre-rolls - convenient, ready to enjoy
Edibles - longer lasting, no smoke
Vaporizers - smooth and discreet

What sounds good to you?"

Follow-Up Test:
Input: "flower please"

Expected:
✅ Stream emits CODEX:RECOMMEND
✅ Products shown (category: "flower", effects: ["relaxed"])
```

**Test Case 2.3: Missing Effect AND Category (Intent only)**
```
Input: "I'm looking for something"

Expected Behavior:
✅ Stream asks about desired feeling first

Response:
"I'd be happy to help you out!

To point you in the right direction, I'm curious - how are you looking to feel?

Uplifted and energized for daytime
Calm and relaxed to unwind
Focused and clear-minded for creative work
Sleepy for a good night's rest

What sounds like what you're after?"

Multi-Turn Test:
1. User: "I'm looking for something"
2. Assistant: [Asks about feeling]
3. User: "sleepy"
4. Assistant: [Asks about category]
5. User: "edibles"
6. Assistant: [Emits CODEX, shows products]
```

**Test Case 2.4: Missing Intent (Effect + Category but no request)**
```
Input: "sleepy indica flower"

Expected Behavior:
✅ Stream asks: "It sounds like you're interested in sleepy indica flower - would you like me to check what we have in stock that matches that?"

Follow-Up Test:
Input: "yes please"

Expected:
✅ Stream emits CODEX:RECOMMEND
✅ Products shown
```

---

### 3. General Questions → No CODEX

**Test Case 3.1: Store Hours**
```
Input: "What are your hours?"

Expected Behavior:
✅ Stream responds immediately
❌ No CODEX emitted
✅ Direct answer provided
✅ No Intent or Recommendations API called

Response:
"We're open 10AM to 10PM Sunday through Thursday, and until 11PM on Fridays and Saturdays! Located at 30-30 Steinway St in Astoria."

Console Output:
🌊 STREAM API CALLED
(No further API calls)

Message Timeline:
1. User: "What are your hours?"
2. Assistant: [Hours information]
```

**Test Case 3.2: Location**
```
Input: "Where are you located?"

Expected:
✅ Direct answer about address
❌ No CODEX, no further API calls
```

**Test Case 3.3: Policies**
```
Input: "What's your return policy?"

Expected:
✅ Direct answer
❌ No CODEX, no further API calls
```

**Test Case 3.4: Cannabis Education**
```
Input: "What's the difference between indica and sativa?"

Expected:
✅ Educational response
❌ No CODEX, no further API calls
```

---

### 4. Product Questions → CODEX:PRODUCT_LOOKUP

**Test Case 4.1: Product by Name (not in history)**
```
Input: "Tell me about Gelato Cake"

Expected Behavior:
✅ Stream emits: "Let me look up Gelato Cake for you."
✅ CODEX:PRODUCT_LOOKUP detected
✅ Extract "Gelato Cake" from cue
✅ Call /product-lookup API (semantic search)
✅ If confidence > 0.7: Stream product details with card
✅ If confidence < 0.7: Ask clarification

Console Output:
🌊 STREAM API CALLED (acknowledgment)
🔍 PRODUCT-LOOKUP API CALLED
🌊 STREAM API CALLED (product details)

Message Timeline:
1. User: "Tell me about Gelato Cake"
2. Assistant: "Let me look up Gelato Cake for you."
3. Assistant: [Product details + card]
```

**Test Case 4.2: Product from Conversation History**
```
Setup:
1. Get recommendations first: "recommend relaxing indica flower"
2. Products shown (including Granddaddy Purple)

Input: "Tell me more about that purple one"

Expected Behavior:
✅ Stream emits: "Let me look up that purple one for you."
✅ CODEX:PRODUCT_LOOKUP detected
✅ Fuzzy match in conversation history
✅ High confidence match for "Granddaddy Purple" (score > 0.7)
✅ Skip /product-lookup API (already in history)
✅ Stream with product context from history

Console Output:
🌊 STREAM API CALLED (acknowledgment)
🌊 STREAM API CALLED (product details from history, no /product-lookup)

Message Timeline:
1. User: "Tell me more about that purple one"
2. Assistant: "Let me look up that purple one for you."
3. Assistant: [Granddaddy Purple details + card]
```

**Test Case 4.3: Ambiguous Product Name**
```
Input: "Tell me about Gelato"

Expected Behavior:
✅ Stream emits: "Let me look up Gelato for you."
✅ CODEX:PRODUCT_LOOKUP detected
✅ Call /product-lookup API
✅ API returns: needsClarification: true, suggestedNames: ["Gelato Cake", "Gelato Sundae"]
✅ Stream follow-up question

Message Timeline:
1. User: "Tell me about Gelato"
2. Assistant: "Let me look up Gelato for you."
3. Assistant: "I'm not quite sure which one you mean. Did you mean Gelato Cake or Gelato Sundae?"

Follow-Up Test:
Input: "Gelato Cake"

Expected:
✅ Stream emits CODEX:PRODUCT_LOOKUP again
✅ High confidence match
✅ Product details shown
```

**Test Case 4.4: Product Not Found**
```
Input: "Tell me about XYZ123 NonexistentProduct"

Expected Behavior:
✅ Stream emits: "Let me look up XYZ123 NonexistentProduct for you."
✅ CODEX:PRODUCT_LOOKUP detected
✅ Call /product-lookup API
✅ No match found (low confidence)
✅ Stream: "I couldn't find that product in our inventory. Would you like me to search for recommendations?"
```

**Test Case 4.5: Follow-up Questions on Same Product**
```
Setup:
1. User: "Tell me about Gelato Cake"
2. Product details shown

Input: "What's the THC percentage?"

Expected Behavior:
✅ Stream recognizes recent product context
✅ Stream emits CODEX:PRODUCT_LOOKUP for same product
✅ Use lastPresentedProduct from state
✅ Stream answer with product context
```

---

### 5. Edge Cases & Error Handling

**Test Case 5.1: Empty Query**
```
Input: ""

Expected:
❌ Nothing happens (input validation)
```

**Test Case 5.2: Very Long Query**
```
Input: "I'm looking for something really relaxing, like super chill, you know, something that will help me unwind after a long day at work, maybe with some nice flavors, nothing too strong, just something smooth and easy, preferably indica or indica-hybrid, and I think I'd like flower or maybe pre-rolls, not sure which one would be better for me, what do you recommend?"

Expected:
✅ Stream processes entire query
✅ Extracts: category (flower or prerolls), type (indica/indica-hybrid), effects (relaxed, calm)
✅ Emits CODEX:RECOMMEND
✅ Products shown
```

**Test Case 5.3: Typos in Product Name**
```
Input: "Tell me about Gelatto Cak"

Expected:
✅ Stream emits CODEX:PRODUCT_LOOKUP
✅ Fuzzy matching in /product-lookup handles typos
✅ If confidence > 0.7: Shows Gelato Cake
✅ If confidence < 0.7: Asks for clarification
```

**Test Case 5.4: Mixed Intent (Recommendation + Product Question)**
```
Input: "I want relaxing edibles and tell me about Gelato Cake"

Expected Behavior:
Stream should prioritize the stronger intent signal.
Most likely: Treats as recommendation request (stronger signal)
✅ Stream emits CODEX:RECOMMEND
✅ Products shown

Alternative: Stream asks for clarification
```

**Test Case 5.5: Backend API Error**
```
Simulate: Stop backend server

Input: "uplifting flower"

Expected:
✅ Stream attempts to call backend
✅ Error caught gracefully
✅ User-friendly error message displayed
✅ Loading state cleared

Message:
"Our streaming service is experiencing technical difficulties. Please try again."
```

**Test Case 5.6: Intent API Error (after CODEX emitted)**
```
Simulate: Backend returns 500 for /intent endpoint

Input: "uplifting flower"

Expected:
✅ Stream emits CODEX:RECOMMEND
✅ Frontend detects CODEX
✅ Intent API call fails
✅ Error message displayed
✅ No recommendations shown

Message:
"Our AI understanding service is experiencing technical difficulties. Please try again."
```

**Test Case 5.7: Recommendations API Error (after Intent succeeds)**
```
Simulate: Backend returns 500 for /recommendations endpoint

Expected:
✅ Stream emits CODEX
✅ Intent API succeeds (filters extracted)
✅ Recommendations API fails
✅ Error message displayed

Message:
"Our recommendation service is experiencing technical difficulties. Please try again."
```

---

### 6. Multi-Turn Conversations

**Test Case 6.1: Complete Guided Flow**
```
Turn 1:
User: "I'm looking for something"
Assistant: [Asks about feeling]

Turn 2:
User: "sleepy"
Assistant: [Asks about category]

Turn 3:
User: "edibles"
Assistant: [Emits CODEX, shows products]

Turn 4:
User: "Tell me more about the first one"
Assistant: [Shows product details]

Turn 5:
User: "What's your return policy?"
Assistant: [Answers general question]
```

**Test Case 6.2: Refinement Flow**
```
Turn 1:
User: "show me edibles"
Assistant: [Asks about effects]

Turn 2:
User: "actually, I want flower"
Assistant: [Asks about effects for flower]

Turn 3:
User: "energizing"
Assistant: [Emits CODEX, shows energizing flower]
```

**Test Case 6.3: Mixed Conversation**
```
Turn 1:
User: "What are your hours?"
Assistant: [Provides hours]

Turn 2:
User: "cool, show me relaxing flower"
Assistant: [Emits CODEX, shows products]

Turn 3:
User: "Tell me about the second one"
Assistant: [Shows product details]

Turn 4:
User: "Where are you located?"
Assistant: [Provides location]
```

---

### 7. Persistence & State Management

**Test Case 7.1: LocalStorage Persistence**
```
1. Have a conversation with recommendations
2. Refresh the page
3. Check that conversation history is preserved
4. Check that product cards are still displayed
5. Ask a follow-up question about a previous product
6. Verify fuzzy matching still works
```

**Test Case 7.2: Clear Chat**
```
1. Have a conversation
2. Click "Clear Chat" button
3. Verify messages are cleared
4. Verify localStorage is cleared
5. Start new conversation
6. Verify it starts fresh
```

---

### 8. Performance Tests

**Test Case 8.1: Time to First Token**
```
Input: "uplifting flower"

Measure:
- Time from send → first token appears
Expected: < 500ms
```

**Test Case 8.2: Recommendation Flow Latency**
```
Input: "uplifting sativa flower"

Measure:
- Time from send → products displayed
Expected: < 3 seconds total
  - Stream complete: < 1s
  - Intent API: < 500ms
  - Recommendations API: < 2s
```

**Test Case 8.3: Product Lookup Latency**
```
Input: "Tell me about Gelato Cake"

Measure:
- Time from send → product details displayed
Expected: < 2.5 seconds total
  - Stream acknowledgment: < 500ms
  - Product lookup: < 1s
  - Product details stream: < 1s
```

---

## Debugging Guide

### Common Issues

#### Issue 1: Stream doesn't emit CODEX when it should
**Symptoms:** User enters complete query, but no products shown

**Debug Steps:**
1. Check Console for "🌊 STREAM API CALLED"
2. Check stream response text in Network tab
3. Verify CODEX cue is present in text
4. Check `detectCodex()` function is detecting it
5. Check if CODEX patterns match exactly

**Fix:** Update CODEX_PATTERNS in Widget.svelte or stream prompt

#### Issue 2: Intent API returns wrong filters
**Symptoms:** Products shown don't match query

**Debug Steps:**
1. Check Console for "🧠 INTENT API CALLED"
2. Check /intent response in Network tab
3. Verify filters extracted match query
4. Check conversation history sent to Intent API

**Fix:** Update intent prompt or filter extraction logic

#### Issue 3: Recommendations API returns no products
**Symptoms:** Shimmer appears but no products

**Debug Steps:**
1. Check Console for "🎯 RECOMMENDATIONS API CALLED"
2. Check /recommendations response in Network tab
3. Verify filters are valid
4. Check if products exist in Vectorize for those filters
5. Check semantic_search query

**Fix:** Adjust filters, update vectorizer, or check Vectorize index

#### Issue 4: Product lookup fails
**Symptoms:** PRODUCT_LOOKUP cue detected but no product shown

**Debug Steps:**
1. Check if productName extracted correctly
2. Check /product-lookup API response
3. Check confidence score
4. Check if product exists in Vectorize

**Fix:** Update extractProductName regex or add product to Vectorize

#### Issue 5: Duplicate messages
**Symptoms:** Two identical messages appear

**Debug Steps:**
1. Check message indices in state updates
2. Verify streamingMessageIndex is set correctly
3. Check if multiple API calls happening

**Fix:** Update message state management logic

---

## Success Criteria

All test scenarios should pass with these requirements:

✅ **Streaming Performance:**
- First token < 500ms
- No cutoffs or broken streams
- No empty bubbles

✅ **CODEX Detection:**
- 100% accuracy on RECOMMEND cues
- 100% accuracy on PRODUCT_LOOKUP cues
- No false positives on general questions

✅ **Intent Extraction:**
- Filters extracted match query
- Effects mapped to canonical list
- Category/type/THC fields correct

✅ **Recommendations:**
- Products match filters
- Re-ranking improves relevance
- No duplicate products

✅ **Product Lookup:**
- Fuzzy matching works for references
- Semantic search finds products
- Ambiguity handling works

✅ **Error Handling:**
- All API errors caught gracefully
- User-friendly error messages
- Loading states cleared properly

✅ **UX:**
- Conversation flows naturally
- Clarifying questions are helpful
- Product cards display correctly
- Persistence works across refresh

---

## Regression Tests

Run these tests after any changes to ensure nothing broke:

1. ✅ Complete query flow (recommendation)
2. ✅ Incomplete query flow (clarification)
3. ✅ General question flow
4. ✅ Product question flow
5. ✅ Multi-turn conversation
6. ✅ Error handling
7. ✅ Persistence

---

## Manual Testing Checklist

Before deploying to production, manually verify:

- [ ] All 6 test scenario categories pass
- [ ] All edge cases handled gracefully
- [ ] No console errors
- [ ] No broken product cards
- [ ] No duplicate messages
- [ ] Persistence works
- [ ] Loading states clear properly
- [ ] CODEX detection is 100% accurate
- [ ] Intent filters are correct
- [ ] Recommendations are relevant
- [ ] Product lookup works
- [ ] Error messages are user-friendly
- [ ] Performance is acceptable (<3s total)

---

## Automated Testing (Future)

For CI/CD integration, consider adding:

1. **Unit Tests:**
   - `detectCodex()` function
   - `extractProductName()` function
   - `fuzzyFindProduct()` function

2. **Integration Tests:**
   - Stream API with various queries
   - Intent API with various inputs
   - Recommendations API with filters
   - Product lookup API

3. **E2E Tests:**
   - Complete recommendation flow
   - Multi-turn conversation flow
   - Product question flow
   - Error handling flow

---

## Notes

- This testing guide should be updated as new features are added
- Report bugs with console logs, network traces, and screenshots
- Performance benchmarks may vary based on network and API load
- Test on multiple browsers (Chrome, Safari, Firefox)
- Test on mobile devices for responsive behavior
