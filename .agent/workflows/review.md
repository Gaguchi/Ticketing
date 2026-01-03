---
description: Code review agent that examines changes for hallucinations, repetition, and quality issues
---

# Code Reviewer Agent

A systematic code review workflow to ensure high-quality, efficient, and hallucination-free code.

## How to Use

Invoke with `/review` after making changes, or specify files:
- `/review` - Review all recent changes
- `/review path/to/file.tsx` - Review specific file
- `/review --staged` - Review staged git changes

---

## Review Checklist

### Phase 1: Hallucination Detection 🔍

Check for code that references non-existent elements:

1. **Verify all imports exist** - Ensure imported modules, components, functions actually exist in the codebase
2. **Check API endpoints** - Verify API routes match actual backend endpoints (check `backend/` for Django URLs)
3. **Validate type definitions** - Ensure TypeScript types/interfaces used are actually defined
4. **Confirm function signatures** - Check that function calls match their actual definitions (parameter count, types)
5. **Verify library usage** - Ensure external library methods exist in the installed version (check package.json)
6. **Check environment variables** - Confirm any referenced env vars are documented and exist

**Red flags:**
- Imports from paths that don't exist
- API calls to undefined endpoints
- Usage of undefined props or state variables
- Function calls with wrong parameter counts

---

### Phase 2: Code Repetition Analysis 🔄

Identify and refactor duplicate code:

1. **Find repeated logic blocks** - Look for similar code patterns across files
2. **Check for copy-paste code** - Identify nearly identical functions or components
3. **Review hook usage** - Ensure custom hooks are used instead of repeated stateful logic
4. **Examine utility functions** - Check if common operations should be extracted to utils
5. **Component duplication** - Identify UI patterns that should be shared components

**Commands to run:**
// turbo
```bash
# Search for potential duplicates - look for similar function signatures
grep -rn "const handle" frontend/src --include="*.tsx" | head -20
```

**Refactoring suggestions:**
- Extract repeated API calls into custom hooks
- Create shared utility functions for common operations
- Build reusable UI components for repeated patterns

---

### Phase 3: Code Quality Assessment ✨

Evaluate code for best practices:

1. **Error handling** - Check for proper try/catch blocks, error boundaries
2. **Loading states** - Verify loading indicators for async operations
3. **TypeScript strictness** - Ensure no `any` types without justification
4. **Null safety** - Check for proper null/undefined handling
5. **Component size** - Flag components over 200 lines for potential splitting
6. **Prop drilling** - Identify excessive prop passing (consider context/state management)
7. **Memory leaks** - Check for proper cleanup in useEffect hooks
8. **Accessibility** - Verify semantic HTML, ARIA labels, keyboard navigation

**Quality commands:**
// turbo
```bash
# Check for TypeScript errors
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

// turbo
```bash
# Run linter
cd frontend && npm run lint 2>&1 | head -30
```

---

### Phase 4: Performance Review ⚡

Check for performance issues:

1. **Unnecessary re-renders** - Look for missing useMemo/useCallback
2. **Large bundle imports** - Check for tree-shaking issues (importing entire libraries)
3. **N+1 queries** - Review API calls for batch optimization
4. **Expensive computations** - Identify heavy operations in render cycle
5. **Image optimization** - Verify images are properly sized and lazy-loaded
6. **Memoization opportunities** - Find expensive component renders

**Performance checks:**
- `useMemo` for expensive calculations
- `useCallback` for functions passed as props
- `React.memo` for pure components
- Lazy loading for route components

---

### Phase 5: Security Review 🔒

Check for security vulnerabilities:

1. **XSS prevention** - Ensure no dangerouslySetInnerHTML with user input
2. **Authentication** - Verify protected routes check auth status
3. **Authorization** - Confirm role-based access is properly enforced
4. **Sensitive data** - Check no secrets/keys in frontend code
5. **Input validation** - Verify user inputs are validated before use
6. **CORS issues** - Check API calls handle CORS properly

---

## Review Output Format

After completing the review, provide a summary:

```markdown
## Code Review Summary

### ✅ Passed Checks
- [List of passing items]

### ⚠️ Warnings
- [Non-critical issues to consider]

### ❌ Issues Found
- [Critical issues that must be fixed]

### 💡 Recommendations
- [Suggestions for improvement]
```

---

## Integration with Development Workflow

This review should be run:
1. Before committing changes
2. Before creating a pull request
3. When reviewing others' code
4. After significant refactoring

**Suggested git hook:** Add to `.git/hooks/pre-commit` to auto-run before commits.
