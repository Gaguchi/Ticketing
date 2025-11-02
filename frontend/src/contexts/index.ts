/**
 * Centralized exports for all context providers and hooks
 */

// Main App Context (combines Auth + Project)
export { AppProvider, useApp, useAuth, useProject } from "./AppContext";

// Company Context
export { CompanyProvider, useCompany } from "./CompanyContext";

// Legacy contexts (deprecated - use AppContext instead)
// Keep these files for reference but don't export them
