import React, { useState, useMemo } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  MeasuringStrategy,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TicketCard } from "./TicketCard";
import type { Ticket, TicketColumn, BoardColumn } from "../types/api";

// Adapter type to support both old TicketColumn and new BoardColumn
interface KanbanColumnData {
  id: string;           // For DnD - "column-{id}" or "status-{key}"
  numericId: number;    // Original ID (for old system)
  name: string;
  order: number;
  statusKeys: string[]; // Status keys this column represents (new system)
  color?: string;
}

interface KanbanBoardProps {
  tickets: Ticket[];
  // Support both old and new column systems
  columns?: TicketColumn[];           // Old system
  boardColumns?: BoardColumn[];       // New system
  onTicketClick?: (ticket: Ticket) => void;
  // Old move handler (column-based)
  onTicketMove?: (
    ticketId: number,
    newColumnId: number,
    order: number,
    oldColumnId: number
  ) => void;
  // New move handler (status-based)
  onTicketMoveToStatus?: (
    ticketId: number,
    statusKey: string,
    beforeTicketId?: number,
    afterTicketId?: number
  ) => void;
  onTicketCreated?: (ticket: Ticket) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  columns,
  boardColumns,
  onTicketClick,
  onTicketMove,
  onTicketMoveToStatus,
  onTicketCreated,
}) => {
  // Determine which mode we're in
  const useNewStatusSystem = Boolean(boardColumns && boardColumns.length > 0);
  
  // Only state: which ticket is being dragged (for DragOverlay UI)
  const [activeId, setActiveId] = useState<string | null>(null);

  // Normalize columns to unified format
  const normalizedColumns: KanbanColumnData[] = useMemo(() => {
    if (useNewStatusSystem && boardColumns) {
      return boardColumns
        .sort((a, b) => a.order - b.order)
        .map((bc) => ({
          id: `column-${bc.id}`,
          numericId: bc.id,
          name: bc.name,
          order: bc.order,
          statusKeys: bc.statuses.map((s) => s.key),
          color: bc.statuses[0]?.category_color,
        }));
    } else if (columns) {
      return [...columns]
        .sort((a, b) => a.order - b.order)
        .map((col) => ({
          id: `column-${col.id}`,
          numericId: col.id,
          name: col.name,
          order: col.order,
          statusKeys: [],
        }));
    }
    return [];
  }, [useNewStatusSystem, boardColumns, columns]);

  const containerIds = useMemo(() => {
    return normalizedColumns.map((col) => col.id);
  }, [normalizedColumns]);

  // Build a map of status key -> column id for new system
  const statusToColumnMap = useMemo(() => {
    if (!useNewStatusSystem) return {};
    const map: Record<string, string> = {};
    normalizedColumns.forEach((col) => {
      col.statusKeys.forEach((key) => {
        map[key] = col.id;
      });
    });
    return map;
  }, [useNewStatusSystem, normalizedColumns]);

  // Group tickets by column, sorted appropriately
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<string, string[]> = {};

    // Initialize empty arrays for all columns
    normalizedColumns.forEach((col) => {
      grouped[col.id] = [];
    });

    // Group tickets based on system
    tickets.forEach((ticket) => {
      let columnKey: string | undefined;
      
      if (useNewStatusSystem && ticket.ticket_status_key) {
        // New system: map status key to column
        columnKey = statusToColumnMap[ticket.ticket_status_key];
      } else {
        // Old system: use column ID directly
        columnKey = `column-${ticket.column}`;
      }
      
      if (columnKey && grouped[columnKey]) {
        grouped[columnKey].push(`ticket-${ticket.id}`);
      }
    });

    // Sort each column's tickets
    Object.keys(grouped).forEach((columnKey) => {
      grouped[columnKey].sort((a, b) => {
        const ticketA = tickets.find((t) => `ticket-${t.id}` === a);
        const ticketB = tickets.find((t) => `ticket-${t.id}` === b);
        
        if (useNewStatusSystem) {
          // New system: sort by LexoRank
          const rankA = ticketA?.rank || '';
          const rankB = ticketB?.rank || '';
          return rankA.localeCompare(rankB);
        } else {
          // Old system: sort by column_order
          return (ticketA?.column_order || 0) - (ticketB?.column_order || 0);
        }
      });
    });

    return grouped;
  }, [tickets, normalizedColumns, useNewStatusSystem, statusToColumnMap]);

  // Map for quick ticket lookup
  const ticketMap = useMemo(() => {
    return tickets.reduce((acc, ticket) => {
      acc[`ticket-${ticket.id}`] = ticket;
      return acc;
    }, {} as Record<string, Ticket>);
  }, [tickets]);

  // Map column ID to column data
  const columnMap = useMemo(() => {
    return normalizedColumns.reduce((acc, col) => {
      acc[col.id] = col;
      return acc;
    }, {} as Record<string, KanbanColumnData>);
  }, [normalizedColumns]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // Find which column contains a ticket
  const findContainer = (id: string): string | undefined => {
    if (containerIds.includes(id)) return id;
    return containerIds.find((containerId) =>
      ticketsByColumn[containerId]?.includes(id)
    );
  };

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);

    if (!over) return;

    const activeTicketId = active.id as string;
    const overId = over.id as string;

    // Find source column
    const sourceContainer = findContainer(activeTicketId);
    if (!sourceContainer) return;

    // Find destination column
    let destContainer: string;
    if (containerIds.includes(overId)) {
      // Dropped on column itself
      destContainer = overId;
    } else {
      // Dropped on a ticket - find its column
      const container = findContainer(overId);
      if (!container) return;
      destContainer = container;
    }

    const ticketId = parseInt(activeTicketId.replace("ticket-", ""));

    // Handle new status-based system
    if (useNewStatusSystem && onTicketMoveToStatus) {
      const destColumn = columnMap[destContainer];
      if (!destColumn || destColumn.statusKeys.length === 0) return;
      
      // Use the first status in the column (primary status)
      const targetStatusKey = destColumn.statusKeys[0];
      
      // Determine before/after ticket for LexoRank positioning
      const destTickets = ticketsByColumn[destContainer] || [];
      let beforeTicketId: number | undefined;
      let afterTicketId: number | undefined;
      
      if (containerIds.includes(overId)) {
        // Dropped on column header - put at end
        if (sourceContainer === destContainer) return; // No-op
        if (destTickets.length > 0) {
          afterTicketId = parseInt(destTickets[destTickets.length - 1].replace("ticket-", ""));
        }
      } else {
        // Dropped on a ticket
        const overIndex = destTickets.indexOf(overId);
        if (overIndex === -1) {
          // Fallback: put at end
          if (destTickets.length > 0) {
            afterTicketId = parseInt(destTickets[destTickets.length - 1].replace("ticket-", ""));
          }
        } else {
          // Insert at the position of the target ticket
          if (sourceContainer === destContainer) {
            // Same column reorder
            const currentIndex = destTickets.indexOf(activeTicketId);
            if (currentIndex === overIndex) return; // No change
            
            if (currentIndex < overIndex) {
              // Moving down: place after the target
              afterTicketId = parseInt(destTickets[overIndex].replace("ticket-", ""));
              if (overIndex + 1 < destTickets.length) {
                beforeTicketId = parseInt(destTickets[overIndex + 1].replace("ticket-", ""));
              }
            } else {
              // Moving up: place before the target  
              beforeTicketId = parseInt(destTickets[overIndex].replace("ticket-", ""));
              if (overIndex > 0) {
                afterTicketId = parseInt(destTickets[overIndex - 1].replace("ticket-", ""));
              }
            }
          } else {
            // Cross-column move: insert before the target
            beforeTicketId = parseInt(destTickets[overIndex].replace("ticket-", ""));
            if (overIndex > 0) {
              afterTicketId = parseInt(destTickets[overIndex - 1].replace("ticket-", ""));
            }
          }
        }
      }
      
      // Don't pass the ticket's own ID as before/after
      if (beforeTicketId === ticketId) beforeTicketId = undefined;
      if (afterTicketId === ticketId) afterTicketId = undefined;
      
      onTicketMoveToStatus(ticketId, targetStatusKey, beforeTicketId, afterTicketId);
      return;
    }

    // Handle old column-based system
    if (!onTicketMove) return;
    
    const newColumnId = parseInt(destContainer.replace("column-", ""));
    const oldColumnId = parseInt(sourceContainer.replace("column-", ""));

    // Calculate drop position
    let dropPosition: number;
    if (containerIds.includes(overId)) {
      // Dropped on empty column or column header - put at end
      dropPosition = ticketsByColumn[destContainer]?.length || 0;
      // If moving to same column (header), this is a no-op
      if (sourceContainer === destContainer) return;
    } else {
      // Dropped on a ticket - insert at that position
      const overIndex = ticketsByColumn[destContainer]?.indexOf(overId) ?? -1;
      if (overIndex === -1) {
        dropPosition = ticketsByColumn[destContainer]?.length || 0;
      } else {
        // If moving within same column, need to account for removal of dragged item
        if (sourceContainer === destContainer) {
          const currentIndex =
            ticketsByColumn[sourceContainer]?.indexOf(activeTicketId) ?? -1;
          // If dragging from above, the target shifts up by 1 after removal
          dropPosition = currentIndex < overIndex ? overIndex - 1 : overIndex;
        } else {
          dropPosition = overIndex;
        }
      }
    }

    // Skip if no actual change (same column, same position)
    if (sourceContainer === destContainer) {
      const currentIndex =
        ticketsByColumn[sourceContainer]?.indexOf(activeTicketId) ?? -1;
      if (currentIndex === dropPosition) return;
    }

    onTicketMove(ticketId, newColumnId, dropPosition, oldColumnId);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeTicket = activeId ? ticketMap[activeId] : null;

  return (
    <div className="kanban">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{
          droppable: { strategy: MeasuringStrategy.WhileDragging },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="kanban-container">
          <SortableContext
            items={containerIds}
            strategy={horizontalListSortingStrategy}
          >
            {normalizedColumns.map((column) => {
              const items = ticketsByColumn[column.id] || [];

              return (
                <KanbanColumn
                  id={column.id}
                  key={column.id}
                  items={items}
                  name={column.name}
                  ticketMap={ticketMap}
                  isSortingContainer={false}
                  onTicketClick={onTicketClick}
                  columnId={column.numericId}
                  onTicketCreated={onTicketCreated}
                  statusKey={column.statusKeys[0]} // Primary status for this column
                />
              );
            })}
          </SortableContext>

          {/* Add Column Button */}
          <div
            style={{
              width: "40px",
              minWidth: "40px",
              marginRight: "8px",
              padding: "8px",
              backgroundColor: "rgba(9,30,66,0.04)",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "background-color 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "40px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(9,30,66,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(9,30,66,0.04)";
            }}
            onClick={() => {
              // TODO: Implement add column functionality
            }}
          >
            <span
              style={{
                fontSize: "20px",
                fontWeight: 400,
                color: "#5e6c84",
                lineHeight: "1",
              }}
            >
              +
            </span>
          </div>
        </div>

        <DragOverlay>
          {activeTicket ? (
            <TicketCard id={activeId!} ticket={activeTicket} dragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
