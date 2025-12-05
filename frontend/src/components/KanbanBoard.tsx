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
import type { Ticket, TicketColumn } from "../types/api";

interface KanbanBoardProps {
  tickets: Ticket[];
  columns: TicketColumn[];
  onTicketClick?: (ticket: Ticket) => void;
  onTicketMove?: (
    ticketId: number,
    newColumnId: number,
    order: number,
    oldColumnId: number
  ) => void;
  onTicketCreated?: (ticket: Ticket) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  columns,
  onTicketClick,
  onTicketMove,
  onTicketCreated,
}) => {
  // Only state: which ticket is being dragged (for DragOverlay UI)
  const [activeId, setActiveId] = useState<string | null>(null);

  // Derive everything from props - no internal state sync needed
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order - b.order);
  }, [columns]);

  const containerIds = useMemo(() => {
    return sortedColumns.map((col) => `column-${col.id}`);
  }, [sortedColumns]);

  // Group tickets by column, sorted by column_order
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<string, string[]> = {};

    // Initialize empty arrays for all columns
    sortedColumns.forEach((col) => {
      grouped[`column-${col.id}`] = [];
    });

    // Group tickets
    tickets.forEach((ticket) => {
      const key = `column-${ticket.column}`;
      if (grouped[key]) {
        grouped[key].push(`ticket-${ticket.id}`);
      }
    });

    // Sort each column's tickets by column_order
    Object.keys(grouped).forEach((columnKey) => {
      grouped[columnKey].sort((a, b) => {
        const ticketA = tickets.find((t) => `ticket-${t.id}` === a);
        const ticketB = tickets.find((t) => `ticket-${t.id}` === b);
        return (ticketA?.column_order || 0) - (ticketB?.column_order || 0);
      });
    });

    return grouped;
  }, [tickets, sortedColumns]);

  // Map for quick ticket lookup
  const ticketMap = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[`ticket-${ticket.id}`] = ticket;
        return acc;
      },
      {} as Record<string, Ticket>
    );
  }, [tickets]);

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

    if (!over || !onTicketMove) return;

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

    console.log("🎯 KanbanBoard onTicketMove:", {
      ticketId,
      newColumnId,
      dropPosition,
      oldColumnId,
      movedBetweenColumns: sourceContainer !== destContainer,
    });

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
            {sortedColumns.map((column) => {
              const containerId = `column-${column.id}`;
              const items = ticketsByColumn[containerId] || [];

              return (
                <KanbanColumn
                  id={containerId}
                  key={containerId}
                  items={items}
                  name={column.name}
                  ticketMap={ticketMap}
                  isSortingContainer={false}
                  onTicketClick={onTicketClick}
                  columnId={column.id}
                  onTicketCreated={onTicketCreated}
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
              console.log("Add new column");
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
            <TicketCard
              id={activeId!}
              ticket={activeTicket}
              dragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
