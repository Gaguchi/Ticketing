import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  closestCenter,
  pointerWithin,
  rectIntersection,
  DndContext,
  DragOverlay,
  getFirstCollision,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  MeasuringStrategy,
  useDndMonitor,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import update from "immutability-helper";
import { KanbanColumn } from "./KanbanColumn";
import { TicketCard } from "./TicketCard";
import type { Ticket, TicketColumn, KanbanItems } from "../types/api";

interface KanbanBoardProps {
  tickets: Ticket[];
  columns: TicketColumn[];
  onTicketClick?: (ticket: Ticket) => void;
  onTicketMove?: (ticketId: number, newColumnId: number) => void;
  onTicketCreated?: (ticket: Ticket) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  columns,
  onTicketClick,
  onTicketMove,
  onTicketCreated,
}) => {
  const [data, setData] = useState<Ticket[] | null>(null);
  const [items, setItems] = useState<KanbanItems>({});
  const [containers, setContainers] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContainer, setActiveContainer] = useState<string | null>(null); // Track original container
  const lastOverId = useRef<string | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const isSortingContainer = activeId ? containers.includes(activeId) : false;

  useEffect(() => {
    if (tickets) {
      setData(tickets);
      const cols: KanbanItems = {};
      const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

      sortedColumns.forEach((c) => {
        cols[`column-${c.id}`] = [];
      });

      tickets.forEach((d) => {
        const columnKey = `column-${d.column}`;
        if (!(columnKey in cols)) {
          cols[columnKey] = [];
        }
        cols[columnKey].push(`ticket-${d.id}`);
      });

      setItems(cols);
      setContainers(Object.keys(cols));
    }
  }, [tickets, columns]);

  const moveBetweenContainers = useCallback(
    (
      activeContainer: string,
      overContainer: string,
      active: any,
      over: any,
      overId: string
    ) => {
      const activeItems = items[activeContainer];
      const overItems = items[overContainer];

      // Safety check: ensure both containers exist
      if (!activeItems || !overItems) {
        console.warn("Container items not found:", {
          activeContainer,
          overContainer,
        });
        return;
      }

      const overIndex = overItems.indexOf(overId);
      const activeIndex = activeItems.indexOf(active.id);

      let newIndex: number;

      if (overId in items) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect?.current?.translated &&
          active.rect.current.translated.top >=
            over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      recentlyMovedToNewContainer.current = true;

      setItems(
        update(items, {
          [activeContainer]: {
            $splice: [[activeIndex, 1]],
          },
          [overContainer]: {
            $splice: [[newIndex, 0, active.id]],
          },
        })
      );
    },
    [items]
  );

  const collisionDetectionStrategy = useCallback(
    (args: any) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container: any) => container.id in items
          ),
        });
      }

      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId !== null) {
        if (overId in items) {
          const containerItems = items[overId];

          if (containerItems.length > 0) {
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container: any) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId as string;
        return [{ id: overId }];
      }

      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );

  const [clonedItems, setClonedItems] = useState<KanbanItems | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const findContainer = (id: string) => {
    if (id in items) return id;
    return containers.find((key) => items[key].includes(id));
  };

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    setClonedItems(items);

    // Save the original container where the drag started
    const container = findContainer(active.id as string);
    setActiveContainer(container || null);

    console.log("🟢 handleDragStart - Original container:", container);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    const overId = over?.id as string;

    if (!overId || active.id in items) return;

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id as string);

    if (!overContainer || !activeContainer) return;

    if (activeContainer !== overContainer) {
      moveBetweenContainers(
        activeContainer,
        overContainer,
        active,
        over,
        overId
      );
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    console.log("🎯 handleDragEnd called:", {
      activeId: active.id,
      overId: over?.id,
      activeData: active.data.current,
      overData: over?.data.current,
    });

    if (!over) {
      console.log("❌ No over target, canceling");
      setActiveId(null);
      setActiveContainer(null);
      return;
    }

    if (active.id in items && over?.id) {
      setContainers((containers) => {
        const activeIndex = containers.indexOf(active.id as string);
        const overIndex = containers.indexOf(over.id as string);
        return arrayMove(containers, activeIndex, overIndex);
      });
    }

    // Use the saved original container and find the final container
    const originalContainer = activeContainer;
    const finalContainer =
      over.id in items ? over.id : findContainer(over.id as string);

    console.log("📍 Container movement:", {
      originalContainer,
      finalContainer,
      movedBetweenColumns: originalContainer !== finalContainer,
    });

    if (!originalContainer || !finalContainer) {
      console.log("❌ Missing container information");
      setActiveId(null);
      setActiveContainer(null);
      return;
    }

    if (finalContainer) {
      const activeIndex = items[finalContainer].indexOf(active.id as string);
      const overIndex = items[finalContainer].indexOf(over.id as string);

      if (activeIndex !== overIndex) {
        setItems((items) => ({
          ...items,
          [finalContainer]: arrayMove(
            items[finalContainer],
            activeIndex,
            overIndex
          ),
        }));
      }

      // Detect cross-column move using the original container vs final container
      if (originalContainer !== finalContainer && onTicketMove) {
        const ticketId = parseInt(active.id.toString().replace("ticket-", ""));
        const newColumnId = parseInt(
          finalContainer.toString().replace("column-", "")
        );

        console.log("✅ Calling onTicketMove (moved between columns):", {
          ticketId,
          newColumnId,
          fromColumn: originalContainer,
          toColumn: finalContainer,
        });

        onTicketMove(ticketId, newColumnId);
      } else {
        console.log("⚠️ NOT calling onTicketMove:", {
          reason:
            originalContainer === finalContainer
              ? "Same container - reordering within column"
              : !onTicketMove
              ? "No callback provided"
              : "Unknown",
          originalContainer,
          finalContainer,
          hasCallback: !!onTicketMove,
        });
      }
    }

    setActiveId(null);
    setActiveContainer(null);
  }

  const handleDragCancel = () => {
    if (clonedItems) {
      setItems(clonedItems);
    }
    setActiveId(null);
    setActiveContainer(null);
    setClonedItems(null);
  };

  // Monitor component to log all drag events
  const DragMonitor = () => {
    useDndMonitor({
      onDragStart(event) {
        console.log("🟢 DND Monitor - onDragStart:", {
          activeId: event.active.id,
          activeData: event.active.data.current,
        });
      },
      onDragMove(event) {
        console.log("🔵 DND Monitor - onDragMove:", {
          activeId: event.active.id,
          delta: event.delta,
        });
      },
      onDragOver(event) {
        console.log("🟡 DND Monitor - onDragOver:", {
          activeId: event.active.id,
          overId: event.over?.id,
          overData: event.over?.data.current,
        });
      },
      onDragEnd(event) {
        console.log("🔴 DND Monitor - onDragEnd:", {
          activeId: event.active.id,
          overId: event.over?.id,
          activeData: event.active.data.current,
          overData: event.over?.data.current,
        });
      },
      onDragCancel(event) {
        console.log("⚪ DND Monitor - onDragCancel:", {
          activeId: event.active.id,
        });
      },
    });
    return null;
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <div className="kanban">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.WhileDragging,
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <DragMonitor />
        <div className="kanban-container">
          <SortableContext
            items={containers}
            strategy={horizontalListSortingStrategy}
          >
            {containers.map((containerId) => {
              const column = columns.find(
                (c) => `column-${c.id}` === containerId
              );
              if (!column) return null;

              // Safety check: ensure items exist for this container
              const containerItems = items[containerId] || [];

              return (
                <KanbanColumn
                  id={containerId}
                  key={containerId}
                  items={containerItems}
                  name={column.name}
                  tickets={data || []}
                  isSortingContainer={isSortingContainer}
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
          {activeId && containers.includes(activeId) ? (
            <KanbanColumn
              id={activeId}
              items={items[activeId] || []}
              name={
                columns.find((c) => `column-${c.id}` === activeId)?.name || ""
              }
              tickets={data || []}
              dragOverlay
              onTicketClick={onTicketClick}
              columnId={
                columns.find((c) => `column-${c.id}` === activeId)?.id || 0
              }
              onTicketCreated={onTicketCreated}
            />
          ) : activeId ? (
            <TicketCard
              id={activeId}
              ticket={
                data?.find((d) => `ticket-${d.id}` === activeId) ||
                ({} as Ticket)
              }
              dragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
