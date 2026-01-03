---
description: Prompt crafter agent that clarifies requirements and gathers context before execution
---

# Prompt Crafter Agent

Invoke with `/clarify` before starting complex tasks to ensure full understanding.

---

## Phase 1: Prompt Analysis 🔍

Parse the user's request for:

1. **Core intent** - What is the user actually trying to achieve?
2. **Scope** - Single file, feature, or system-wide change?
3. **Constraints** - Any technologies, patterns, or approaches specified?
4. **Success criteria** - How will we know when it's done?

---

## Phase 2: Ambiguity Detection ❓

Identify gaps in the request:

### Technical Ambiguities
- Which components/files are affected?
- Frontend, backend, or both?
- New feature vs modification vs bug fix?
- Breaking changes acceptable?

### Design Ambiguities  
- UI/UX expectations?
- Mobile responsiveness requirements?
- Loading/error state handling?

### Integration Ambiguities
- API changes needed?
- Database migrations required?
- Authentication/authorization impacts?

---

## Phase 3: Clarifying Questions 💬

If ambiguities found, ask CONCISE questions:

```markdown
Before I proceed, I have a few questions:

1. [Most critical question]
2. [Second priority question]
3. [Third if necessary - max 3-4 questions]
```

**Rules:**
- Maximum 4 questions at once
- Prioritize blocking questions only
- Provide sensible defaults: "Should X do Y? (I'll assume yes if not specified)"
- Group related questions

---

## Phase 4: Context Gathering 📂

After clarification, gather relevant context:

### Codebase Research
// turbo
```bash
# Find related files
fd -e tsx -e ts "[keyword]" frontend/src --type f | head -10
```

// turbo
```bash
# Check for existing patterns
grep -rn "similar_pattern" frontend/src --include="*.tsx" | head -10
```

### Key Files to Examine
1. **Related components** - Similar UI or logic
2. **API endpoints** - Backend routes involved
3. **Types/interfaces** - Existing type definitions
4. **Utils/hooks** - Reusable code to leverage

### Document Findings
```markdown
## Context Summary

**Related Files:**
- `path/to/file.tsx` - [why relevant]

**Existing Patterns:**
- [Pattern found in codebase]

**Dependencies:**
- [APIs, types, utils to use]

**Risks:**
- [Potential issues to watch for]
```

---

## Phase 5: Execution Brief 📋

Before starting work, confirm the plan:

```markdown
## Execution Plan

**Goal:** [One-sentence summary]

**Changes:**
1. [File/component] - [What changes]
2. [File/component] - [What changes]

**Approach:** [Brief technical approach]

**Estimated scope:** [Small/Medium/Large]

Shall I proceed?
```

---

## When to Use This Workflow

✅ Complex features spanning multiple files
✅ Ambiguous or open-ended requests  
✅ System-wide refactoring
✅ New integrations or APIs

❌ Simple bug fixes
❌ Obvious single-file edits
❌ Direct instructions with clear scope
