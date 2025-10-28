import React from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { TicketCard } from "./TicketCard";
import type { Ticket } from "../types/ticket";

interface KanbanColumnProps {
  id: string;
  items: string[];
  name: string;
  tickets: Ticket[];
  isSortingContainer?: boolean;
  dragOverlay?: boolean;
  onTicketClick?: (ticket: Ticket) => void;
  pendingUpdates?: Set<number>; // Track pending ticket updates
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  items,
  name,
  tickets,
  isSortingContainer,
  dragOverlay,
  onTicketClick,
  pendingUpdates = new Set(),
}) => {
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
    minWidth: "272px",
    maxWidth: "272px",
    borderRadius: "3px",
    backgroundColor: "#f4f5f7",
    height: "calc(100vh - 180px)",
  };

  return (
    <div ref={setNodeRef} style={style}>
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
            const ticket = tickets.find((t) => `ticket-${t.id}` === item);
            if (!ticket) return null;
            const isPending = pendingUpdates.has(ticket.id);
            return (
              <TicketCard
                id={item}
                key={item}
                ticket={ticket}
                disabled={isSortingContainer}
                onClick={onTicketClick}
                isPending={isPending}
              />
            );
          })}
        </SortableContext>
        <Button
          type="text"
          icon={<PlusOutlined style={{ fontSize: "14px" }} />}
          size="small"
          style={{
            width: "100%",
            textAlign: "left",
            fontSize: "14px",
            height: "32px",
            marginTop: "4px",
            padding: "4px 8px",
            color: "#5e6c84",
            justifyContent: "flex-start",
            fontWeight: 400,
          }}
        >
          Create
        </Button>
      </div>
    </div>
  );
};
