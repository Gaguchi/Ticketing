import React, { useState } from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "antd";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import { TicketCard } from "./TicketCard";
import { QuickTicketCreator } from "./QuickTicketCreator";
import type { Ticket } from "../types/api";

/**
 * Bottom drop zone component to allow dropping tickets at the end of a column.
 * This creates an invisible droppable area below all tickets but above the Create button.
 */
const ColumnBottomDropZone: React.FC<{ columnId: string }> = ({ columnId }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `${columnId}-bottom`,
    data: {
      type: "COLUMN_BOTTOM",
      columnId: columnId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        // Zero height when not hovering - completely invisible
        minHeight: isOver ? "8px" : "0px",
        backgroundColor: isOver ? "rgba(0, 82, 204, 0.1)" : "transparent",
        borderRadius: "4px",
        transition: "all 0.15s ease",
      }}
    />
  );
};

interface KanbanColumnProps {
  id: string;
  items: string[];
  name: string;
  ticketMap: Record<string, Ticket>;
  columnId: number; // Column ID for old system
  statusKey?: string; // Status key for new system (if using status-based creation)
  isSortingContainer?: boolean;
  dragOverlay?: boolean;
  onTicketClick?: (ticket: Ticket) => void;
  onTicketCreated?: (ticket: Ticket) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  items,
  name,
  ticketMap,
  columnId,
  statusKey,
  isSortingContainer,
  dragOverlay,
  onTicketClick,
  onTicketCreated,
}) => {
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transition,
    transform,
  } = useSortable({
    id: id,
    data: {
      type: "COLUMN",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: dragOverlay ? "0 2px 8px rgba(0,0,0,0.15)" : undefined,
    border: "none",
    touchAction: "manipulation",
    display: "flex",
    flexDirection: "column",
    marginRight: "8px",
    minWidth: "288px",
    maxWidth: "288px",
    borderRadius: "3px",
    backgroundColor: "#f4f5f7",
    height: "calc(100vh - 180px)",
  };

  return (
    <div ref={setNodeRef} style={style} className="kanban-column">
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        style={{
          padding: "12px 12px 8px",
          fontWeight: 600,
          fontSize: "13px",
          cursor: dragOverlay ? "grabbing" : "grab",
          color: "#172b4d",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          letterSpacing: "0.04em",
        }}
      >
        <span>{name}</span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#5e6c84",
            backgroundColor: "#dfe1e6",
            padding: "2px 8px",
            borderRadius: "10px",
          }}
        >
          {items.length}
        </span>
      </div>
      <div
        className="kanban-column__body"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px 8px",
        }}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => {
            const ticket = ticketMap[item];
            if (!ticket) return null;
            return (
              <TicketCard
                id={item}
                key={item}
                ticket={ticket}
                disabled={isSortingContainer}
                onClick={onTicketClick}
              />
            );
          })}
        </SortableContext>

        {/* Bottom drop zone for dropping below all tickets */}
        <ColumnBottomDropZone columnId={id} />

        {/* Quick Ticket Creator or Create Button */}
        {showQuickCreate ? (
          <div>
            <QuickTicketCreator
              columnId={columnId}
              statusKey={statusKey}
              onSuccess={(ticket) => {
                console.log(
                  `[KanbanColumn] onSuccess received ticket:`,
                  ticket.id
                );
                onTicketCreated?.(ticket);
              }}
              onClose={() => setShowQuickCreate(false)}
            />
            <Button
              type="text"
              icon={<CloseOutlined />}
              size="small"
              onClick={() => setShowQuickCreate(false)}
              style={{
                width: "100%",
                marginTop: "4px",
                color: "#5e6c84",
                fontSize: "13px",
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="text"
            icon={<PlusOutlined style={{ fontSize: "14px" }} />}
            size="small"
            onClick={() => setShowQuickCreate(true)}
            style={{
              width: "100%",
              textAlign: "left",
              fontSize: "14px",
              height: "32px",
              padding: "4px 8px",
              color: "#5e6c84",
              justifyContent: "flex-start",
              fontWeight: 400,
            }}
          >
            Create
          </Button>
        )}
      </div>
    </div>
  );
};
