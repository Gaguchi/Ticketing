---
description: Analyze code for quality, tech bloat, and maintainability with scoring and refactor suggestions
---

# Code Refactor Analysis Bot

## How to Use
Run `/refactor` followed by a file path, directory, or component name. Examples:
- `/refactor backend/tickets/views.py`
- `/refactor frontend/src/pages/`
- `/refactor CompanyViewSet`

---

## Analysis Categories

### 1. 📐 Code Composition Analysis
Check the overall structure:
- [ ] File length (flag if >400 lines)
- [ ] Function/method length (flag if >50 lines)
- [ ] Class size (flag if >10 methods or >300 lines)
- [ ] Import count (flag if >20 imports)
- [ ] Nesting depth (flag if >4 levels)

### 2. 🔄 DRY (Don't Repeat Yourself)
Look for:
- [ ] Duplicate code blocks (similar logic in multiple places)
- [ ] Copy-paste patterns with minor variations
- [ ] Repeated string literals or magic numbers
- [ ] Similar functions that should be consolidated

### 3. 🔧 Hardcoding Check
Scan for:
- [ ] Hardcoded URLs, paths, or endpoints
- [ ] Magic numbers without const/enum definitions
- [ ] Hardcoded strings that should be in config/i18n
- [ ] Environment-specific values not in env vars

### 4. 📦 Modularity Assessment
Evaluate:
- [ ] Single Responsibility Principle adherence
- [ ] Function/class doing too many things
- [ ] Tight coupling between modules
- [ ] Missing abstraction opportunities
- [ ] God classes or god functions

### 5. 📖 Readability Score
Check:
- [ ] Clear, descriptive naming (variables, functions, classes)
- [ ] Adequate comments for complex logic
- [ ] Consistent code style and formatting
- [ ] Logical code organization
- [ ] Self-documenting code patterns

### 6. 🏗️ Best Practices Adherence
Verify:

**Python/Django:**
- [ ] Proper exception handling (not bare except)
- [ ] Use of type hints
- [ ] Proper queryset optimization (select_related, prefetch_related)
- [ ] No N+1 query patterns
- [ ] Proper use of Django ORM

**React/TypeScript:**
- [ ] Proper TypeScript types (no `any`)
- [ ] Memoization where needed (useMemo, useCallback)
- [ ] Proper hook dependencies
- [ ] Component composition patterns
- [ ] Proper error boundaries

### 7. 🗑️ Tech Bloat Detection
Identify:
- [ ] Unused imports
- [ ] Dead code (unreachable or never called)
- [ ] Unused variables or parameters
- [ ] Deprecated patterns or APIs
- [ ] Unnecessary dependencies

---

## Output Format

After analysis, provide:

```
## 📊 Code Quality Score: [X/100]

### Category Breakdown
| Category | Score | Issues |
|----------|-------|--------|
| Composition | X/15 | ... |
| DRY | X/15 | ... |
| No Hardcoding | X/15 | ... |
| Modularity | X/15 | ... |
| Readability | X/15 | ... |
| Best Practices | X/15 | ... |
| No Bloat | X/10 | ... |

### 🔴 Critical Issues (Must Fix)
1. [Issue description with file:line reference]

### 🟡 Warnings (Should Fix)
1. [Issue description with file:line reference]

### 🟢 Suggestions (Nice to Have)
1. [Suggestion with rationale]

### 🔨 Refactor Recommendations
1. **[Title]**: [Detailed recommendation with before/after example if applicable]
```

---

## Scoring Guidelines

- **90-100**: Excellent - Production-ready, well-maintained code
- **75-89**: Good - Minor improvements needed
- **60-74**: Acceptable - Several areas need attention
- **40-59**: Poor - Significant refactoring required
- **0-39**: Critical - Major rewrite recommended

---

## Automatic Fixes

If score is below 75 and user approves, offer to:
1. Extract repeated code into utilities/hooks
2. Replace magic numbers with constants
3. Add missing type annotations
4. Split large files/functions
5. Remove dead code and unused imports
