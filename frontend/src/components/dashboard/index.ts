/**
 * Dashboard Components Index
 * Central export for all dashboard components
 */

// Original components (kept for backward compatibility)
export { default as CompanyHealthCard } from './CompanyHealthCard';
export { default as KanbanFlowOverview } from './KanbanFlowOverview';
export { default as NewestTickets } from './NewestTickets';
export { default as AttentionNeeded } from './AttentionNeeded';
export { default as LiveActivityFeed } from './LiveActivityFeed';
export { default as AgentWorkload } from './AgentWorkload';

// New redesigned components
export { default as CompanyFilterBar } from './CompanyFilterBar';
export { default as KanbanPipeline } from './KanbanPipeline';
export { default as AttentionNeededCards } from './AttentionNeededCards';
export { default as NewestTicketCards } from './NewestTicketCards';
export { default as TimelineActivityFeed } from './TimelineActivityFeed';
export { default as TeamWorkloadCards } from './TeamWorkloadCards';
