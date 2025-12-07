import React, { useState, useMemo, useCallback } from "react";
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
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TicketCard } from "./TicketCard";
import type { Ticket, TicketColumn, BoardColumn } from "../types/api";

// Adapter type to support both old TicketColumn and new BoardColumn
interface KanbanColumnData {
  id: string; // For DnD - "column-{id}" or "status-{key}"
  numericId: number; // Original ID (for old system)
  name: string;
  order: number;
  statusKeys: string[]; // Status keys this column represents (new system)
  color?: string;
}

interface KanbanBoardProps {
  tickets: Ticket[];
  // Support both old and new column systems
  columns?: TicketColumn[]; // Old system
  boardColumns?: BoardColumn[]; // New system
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

  // State for drag operations
  const [activeId, setActiveId] = useState<string | null>(null);
  // Track items during drag for cross-column preview
  const [dragOverItems, setDragOverItems] = useState<Record<string, string[]> | null>(null);

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
          const rankA = ticketA?.rank || "";
          const rankB = ticketB?.rank || "";
          return rankA.localeCompare(rankB);
        } else {
          // Old system: sort by column_order
          return (ticketA?.column_order || 0) - (ticketB?.column_order || 0);
        }
      });
    });

    return grouped;
  }, [tickets, normalizedColumns, useNewStatusSystem, statusToColumnMap]);

  // Use drag-over items during drag for preview, otherwise use computed items
  const currentItems = dragOverItems ?? ticketsByColumn;

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

  // Find which column contains a ticket (uses currentItems for drag preview)
  const findContainer = useCallback((id: string): string | undefined => {
    if (containerIds.includes(id)) return id;
    const items = dragOverItems ?? ticketsByColumn;
    return containerIds.find((containerId) =>
      items[containerId]?.includes(id)
    );
  }, [containerIds, dragOverItems, ticketsByColumn]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    // Initialize dragOverItems from ticketsByColumn
    setDragOverItems({ ...ticketsByColumn });
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragOverItems) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find current containers
    const activeContainer = findContainer(activeId);
    const overContainer = containerIds.includes(overId) 
      ? overId 
      : findContainer(overId);

    if (!activeContainer || !overContainer) {
      console.log('[DragOver] No container found:', { activeContainer, overContainer });
      return;
    }

    // If same container, reorder within
    if (activeContainer === overContainer) {
      const items = dragOverItems[activeContainer];
      const oldIndex = items.indexOf(activeId);
      const newIndex = containerIds.includes(overId) 
        ? items.length - 1 // Dropped on column = end of column
        : items.indexOf(overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        console.log(`[DragOver] Same column reorder: oldIndex=${oldIndex}, newIndex=${newIndex}, overId=${overId}`);
        setDragOverItems({
          ...dragOverItems,
          [activeContainer]: arrayMove(items, oldIndex, newIndex),
        });
      }
    } else {
      // Cross-column move
      const activeItems = [...dragOverItems[activeContainer]];
      const overItems = [...dragOverItems[overContainer]];

      const activeIndex = activeItems.indexOf(activeId);
      const overIndex = containerIds.includes(overId)
        ? overItems.length // Dropped on column = end
        : overItems.indexOf(overId);

      console.log(`[DragOver] Cross-column: from=${activeContainer} to=${overContainer}, activeIndex=${activeIndex}, overIndex=${overIndex}, overId=${overId}`);

      // Remove from source
      activeItems.splice(activeIndex, 1);
      
      // Insert into destination
      overItems.splice(overIndex < 0 ? overItems.length : overIndex, 0, activeId);

      setDragOverItems({
        ...dragOverItems,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      });
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const activeTicketId = active.id as string;
    const overId = over?.id as string;

    // Find source column BEFORE resetting state (uses dragOverItems if available)
    const sourceContainer = findContainer(activeTicketId);
    
    // Find destination column
    let destContainer: string | undefined;
    if (over) {
      if (containerIds.includes(overId)) {
        destContainer = overId;
      } else {
        destContainer = findContainer(overId);
      }
    }

    // Get the final positions from dragOverItems before resetting
    const finalItems = dragOverItems ? { ...dragOverItems } : null;

    // Reset preview state
    setDragOverItems(null);
    setActiveId(null);

    if (!over || !sourceContainer || !destContainer) {
      console.log('[DragEnd] Early return - missing over/source/dest:', { over: !!over, sourceContainer, destContainer });
      return;
    }

    const ticketId = parseInt(activeTicketId.replace("ticket-", ""));

    console.log(`[DragEnd] ticketId=${ticketId}, from=${sourceContainer} to=${destContainer}, sameCol=${sourceContainer === destContainer}, overId=${overId}`);

    // Handle new status-based system
    if (useNewStatusSystem && onTicketMoveToStatus) {
      const destColumn = columnMap[destContainer];
      if (!destColumn || destColumn.statusKeys.length === 0) {
        console.log('[DragEnd] No dest column or status keys');
        return;
      }

      // Use the first status in the column (primary status)
      const targetStatusKey = destColumn.statusKeys[0];

      // Use the FINAL drag state to determine positioning
      // This shows where the user actually dropped the ticket
      const finalDestTickets = finalItems?.[destContainer] || [];
      const dropIndex = finalDestTickets.indexOf(activeTicketId);
      
      // Get original position to detect no-op
      const origTickets = ticketsByColumn[destContainer] || [];
      const origIndex = origTickets.indexOf(activeTicketId);
      
      // Check if this is a no-op (same column, same position)
      if (sourceContainer === destContainer && dropIndex === origIndex) {
        console.log(`[DragEnd] No-op: same position (index=${dropIndex})`);
        return;
      }
      
      console.log(`[DragEnd] status=${targetStatusKey}, origIndex=${origIndex}, dropIndex=${dropIndex}`);
      console.log(`[DragEnd] finalTickets: ${finalDestTickets.join(', ')}`);
      console.log(`[DragEnd] origTickets: ${origTickets.join(', ')}`);

      // LexoRank semantics:
      // - before_id = ticket ABOVE the drop position (has smaller rank)
      // - after_id = ticket BELOW the drop position (has larger rank)
      // 
      // In our list, index 0 is at the top (smallest rank), so:
      // - dropIndex - 1 = ticket above = before_id
      // - dropIndex + 1 = ticket below = after_id
      let beforeTicketId: number | undefined; // Ticket ABOVE (smaller rank)
      let afterTicketId: number | undefined;  // Ticket BELOW (larger rank)

      if (dropIndex === -1) {
        // Shouldn't happen, but fallback to end of column
        console.log('[DragEnd] Ticket not found in final items, placing at end');
        if (origTickets.length > 0) {
          const lastTicket = origTickets[origTickets.length - 1];
          if (lastTicket !== activeTicketId) {
            // Place after the last ticket (it becomes our "before")
            beforeTicketId = parseInt(lastTicket.replace("ticket-", ""));
          }
        }
      } else {
        // Get neighbors from the final drop position
        // Ticket ABOVE the drop position (smaller rank = "before")
        if (dropIndex > 0) {
          const aboveTicket = finalDestTickets[dropIndex - 1];
          if (aboveTicket !== activeTicketId) {
            beforeTicketId = parseInt(aboveTicket.replace("ticket-", ""));
          }
        }
        // Ticket BELOW the drop position (larger rank = "after")
        if (dropIndex < finalDestTickets.length - 1) {
          const belowTicket = finalDestTickets[dropIndex + 1];
          if (belowTicket !== activeTicketId) {
            afterTicketId = parseInt(belowTicket.replace("ticket-", ""));
          }
        }
      }

      // Don't pass the ticket's own ID as before/after
      if (beforeTicketId === ticketId) beforeTicketId = undefined;
      if (afterTicketId === ticketId) afterTicketId = undefined;

      console.log(`[DragEnd] API CALL: ticketId=${ticketId}, status=${targetStatusKey}, beforeId=${beforeTicketId}, afterId=${afterTicketId}`);

      onTicketMoveToStatus(
        ticketId,
        targetStatusKey,
        beforeTicketId,
        afterTicketId
      );
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
    setDragOverItems(null);
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
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="kanban-container">
          <SortableContext
            items={containerIds}
            strategy={horizontalListSortingStrategy}
          >
            {normalizedColumns.map((column) => {
              const items = currentItems[column.id] || [];

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
