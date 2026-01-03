# Agent Rules for Ticketing Project

## Mandatory Clarification Before Starting

**CRITICAL**: Before starting ANY coding task, you MUST:

### 1. Analyze the Request
- Identify the core intent - what is the user actually trying to achieve?
- Determine scope - single file, feature, or system-wide?
- Note any constraints or preferences mentioned

### 2. Detect Ambiguities
Check for unclear aspects:
- Which files/components are affected?
- Frontend, backend, or both?
- New feature vs modification vs bug fix?
- UI/UX expectations unclear?
- API or database changes needed?

### 3. Ask Clarifying Questions (if needed)
If ambiguities exist that could lead to wrong implementation:
- Ask maximum 3-4 focused questions
- Provide sensible defaults when possible
- Example: "Should filters persist in URL? (I'll assume yes if not specified)"

**Skip clarification for:**
- Simple bug fixes with clear reproduction
- Obvious single-file edits
- Direct instructions with explicit scope

### 4. Gather Context Before Coding
- Find related files and existing patterns
- Check for reusable components/hooks/utils
- Review relevant API endpoints and types
- Note potential risks or dependencies

---

## Mandatory Code Review Before Completion

**CRITICAL**: Before considering ANY coding task complete, you MUST perform an internal review of ALL changes made:

### Hallucination Check
- Verify all imports reference files that actually exist
- Confirm API endpoints match backend routes in `backend/tickets/urls.py`
- Check that TypeScript types/interfaces are defined
- Validate function signatures match their definitions

### Repetition Check  
- Scan for duplicate code patterns in modified files
- Identify copy-paste code that should be refactored
- Flag repeated logic that could be extracted to hooks/utils

### Quality Check
- Ensure proper error handling (try/catch, error states)
- Verify loading states for async operations
- Check for `any` types that should be properly typed
- Confirm null/undefined safety
- Review component size (flag if >200 lines)

### Performance Check
- Look for missing useMemo/useCallback opportunities
- Check for unnecessary re-renders
- Verify efficient data fetching patterns

### Security Check
- No dangerouslySetInnerHTML with user input
- Protected routes check authentication
- No sensitive data in frontend code

## Review Output Required

After completing code changes, provide a brief review summary:
```
## Self-Review Summary
✅ Imports verified | ✅ Types checked | ✅ No repetition | ✅ Quality OK | ✅ Performance OK
```

If ANY issues are found, fix them BEFORE reporting completion to the user.

---

## QA Agent - Test Verification

**CRITICAL**: For any NEW feature or significant modification:

### Test Coverage Check
- Verify unit tests exist for new functions/logic
- Check component tests for new React components
- Ensure API endpoints have corresponding test cases

### Browser Verification (for UI changes)
- Use Playwright/browser tool to verify UI renders correctly
- Test happy path user flow
- Check error states display properly
- Verify responsiveness on different viewport sizes

### API Verification (for backend changes)
- Test endpoint returns expected response
- Verify error handling works correctly
- Check authentication/authorization is enforced

**Output:**
```
## QA Summary
🧪 Tests: [exist/missing] | 🌐 Browser: [verified/skipped] | 🔌 API: [verified/skipped]
```

---

## Complexity Checker - Keep It Simple

**CRITICAL**: During implementation, actively prevent over-engineering:

### Code Simplicity Rules
- **Functions**: Flag if >30 lines → suggest splitting
- **Nesting**: Flag if >3 levels deep → suggest flattening
- **Parameters**: Flag if function has >4 params → suggest object param
- **Components**: Flag if >200 lines → suggest splitting

### Anti-Patterns to Avoid
- Premature abstraction (don't create utils for one-time use)
- Over-generalization (don't build for imaginary future requirements)
- Unnecessary layers (don't add abstraction layers without clear benefit)
- Complex state (prefer derived state over duplicated state)

### Simplicity Principles
- Can this be done with fewer lines?
- Is this pattern already used elsewhere? Reuse it.
- Would a junior dev understand this easily?
- Is this the simplest solution that works?

**If complexity detected, simplify BEFORE delivery.**

---

## Regression Guard - Don't Break Existing

**CRITICAL**: After making changes, verify nothing is broken:

### Build Verification
- Run `npm run build` or `tsc --noEmit` - must pass
- Run `npm run lint` - no new errors

### Test Verification  
- Run existing tests - all must pass
- If tests fail, FIX before delivery

### Runtime Verification
- Check browser console for new errors
- Verify existing features still work
- Test integration points (API calls, navigation)

**Output:**
```
## Regression Summary
🔨 Build: [pass/fail] | 🧪 Tests: [pass/fail] | 🌐 Runtime: [verified]
```

---

## Complete Pipeline Summary

Every task follows this pipeline:

```
📝 Prompt → 🔍 Clarify → ⚙️ Implement → 🏗️ Simplify → ✅ Review → 🧪 QA → 🔄 Guard → 📋 Deliver
```
