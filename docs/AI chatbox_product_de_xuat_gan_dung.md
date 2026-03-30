# Two-Step Product Confirmation Implementation

## Overview
Implemented a **two-step confirmation workflow** where the AI chatbox now shows product candidates when a product name is ambiguous, allowing users to confirm which product they want before executing operations.

## Changes Made

### 🔧 Backend Changes (`server/src/routes/ai.ts`)

#### 1. Modified `resolveProductReference()` (Line 172-209)
**Before:** Always auto-selected the "best" product match
**After:** 
- Only auto-selects when: 1 exact match OR confidence score ≥ 0.90
- Returns all candidates when ambiguous ( multiple similar matches)
- Returns candidates with `{ product: null, candidates: [...] }` for user selection

```typescript
// Only auto-select if very confident
if (candidates.length === 1 || (candidates[0]?.score ?? 0) >= 0.90) {
  // auto-select the product
} else {
  // Return candidates for user to choose
  return { product: null, candidates }
}
```

#### 2. New Function: `extractProductSelection()` (Line 281-305)
Detects when user is selecting from candidates list. Recognizes:
- "Chọn 1" / "Chọn 2" / "Chọn 3" (Select 1, 2, 3)
- "Thứ 1" / "Cái thứ nhất" (The 1st / First one)
- Product name matches from the candidates list

```typescript
function extractProductSelection(message: string, candidates: ProductCandidate[]): ProductCandidate | null {
  // Matches "chọn 1", "thứ 1", "cái thứ nhất", or product name
  // Returns the selected ProductCandidate or null
}
```

#### 3. New Function: `extractPendingCandidates()` (Line 306-335)
Looks back through message history to find previous candidates and original intent:
```typescript
function extractPendingCandidates(messages: [...])
  Returns: { candidates: ProductCandidate[], originalIntent: string }
```

#### 4. Enhanced `summarizeActions()` (Line 338-395)
- Formats candidates as numbered list with prices
- Displays: "1. Product Name (CODE) - Giá: 50000"
- Prompts user to select: "Chỉ cần nói 'chọn 1', 'chọn 2', v.v..."

#### 5. Updated `SYSTEM_PROMPT` (Line 483-503)
- Instructs AI to list candidates clearly when ambiguous
- Shows how to format options for user selection
- Emphasizes never claiming success without tool confirmation

#### 6. POST `/api/ai/chat` Endpoint (Line 749-786)
Added **product confirmation detection** BEFORE agentic loop:
```
User says "chọn 1" 
  → Extract selected product from pending candidates
  → Get original intent (e.g., "update_product")
  → Re-execute tool with selected product ID
  → Return result immediately
```

### 🎨 Frontend Changes (`src/components/AiChatBox.tsx`)

#### 1. Updated `ChatMessage` Type
Added `candidates` field:
```typescript
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  actions?: ToolAction[]
  candidates?: ProductCandidate[]  // NEW
}
```

#### 2. New Function: `renderProductCandidates()` (Line 102-150)
Displays product candidates as clickable buttons:
- Shows numbered list (1, 2, 3...)
- Displays product name, code, and price
- Blue themed UI that highlights on hover

#### 3. Enhanced `handleSend()` (Line 209-231)
Extracts candidates from API response and stores in message state

#### 4. New Function: `handleProductSelect()` (Line 232-311)
Handles product button clicks:
- Auto-sends "Chọn X" confirmation message
- Makes follow-up API call with selection
- Displays result of the operation

#### 5. Updated Message Rendering
Shows product candidates between message text and action badges:
```jsx
{m.candidates && m.candidates.length > 0 && (
  renderProductCandidates(m.candidates, (idx) => handleProductSelect(m.candidates!, idx))
)}
```

## Workflow Example

### Scenario: Update price of "sữa tươi" (ambiguous - matches 3 products)

**Step 1 - User Request:**
```
User: "Đổi giá bán sữa tươi thành 60000"
```

**Step 2 - System Returns Candidates:**
```
AI: "Tìm thấy nhiều sản phẩm gần đúng. Bạn muốn chọn:
    1. Sữa tươi Aarex 180ml (AAREX001) - Giá: 45000
    2. Sữa tươi Anchor 180ml (ANCHOR001) - Giá: 42000
    3. Sữa tươi Vinamilk 180ml (VINA001) - Giá: 50000
    
    Chỉ cần nói "chọn 1", "chọn 2", v.v..."
```
Frontend shows 3 clickable product buttons

**Step 3 - User Confirms:**
```
User: "Chọn 1"  (or clicks button #1)
```

**Step 4 - System Executes:**
```
Backend: Updates Aarex product price to 60000
AI: "✓ Đã cập nhật Sữa tươi Aarex 180ml (AAREX001). Giá bán: 60000"
```

## Benefits

✅ **Accuracy:** Ensures correct product is updated
✅ **User Friendly:** Clear visual selection with buttons
✅ **Natural Language:** Can type "chọn 1" or click button  
✅ **Prevents Errors:** No more accidental updates to wrong products
✅ **Audit Trail:** Users confirm before operations execute
✅ **Scalable:** Works for any product operation (update, delete, etc.)

## Testing

To test the workflow:

```powershell
# 1. Create multiple similar products
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Thêm sữa tươi Aarex 180ml, code AAREX180, giá 45000","history":[]}'

# 2. Try ambiguous update (should show candidates)
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Đổi giá bán sữa tươi thành 55000","history":[]}'

# 3. Select product (should execute)
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Chọn 1","history":[...]}'  # Include previous messages
```

## Files Modified

- ✅ `server/src/routes/ai.ts` - Backend agentic AI logic
- ✅ `src/components/AiChatBox.tsx` - Frontend UI components
- ✅ Build status: **SUCCESS** (`npm run build` ✓)

## Next Steps

To further enhance:
1. Add product filtering by category/supplier before showing candidates
2. Add "Cancel" button to dismiss candidates without selecting
3. Add keyboard shortcuts (press 1, 2, 3 to select)
4. Extend to other modules (customers, sales, etc.)
5. Add audit logging of which product user confirmed

## Status: ✅ IMPLEMENTATION COMPLETE

The two-step product confirmation workflow is fully implemented and ready for testing/deployment.
