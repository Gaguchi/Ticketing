import React from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Badge } from "antd";
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
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  items,
  name,
  tickets,
  isSortingContainer,
  dragOverlay,
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
    border: dragOverlay ? "1px solid #1890ff" : "1px solid #e8e8e8",
    touchAction: "manipulation",
    display: "flex",
    flexDirection: "column",
    marginRight: "10px",
    minWidth: "240px",
    maxWidth: "240px",
    borderRadius: "2px",
    backgroundColor: "#fafafa",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        style={{
          padding: "10px 12px",
          fontWeight: 600,
          fontSize: "13px",
          cursor: dragOverlay ? "grabbing" : "grab",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e8e8e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{name}</span>
        <Badge
          count={items.length || 0}
          showZero
          style={{
            backgroundColor: "#fff",
            color: "#000",
            border: "1px solid #e8e8e8",
            fontSize: "11px",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          minHeight: "200px",
        }}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => {
            const ticket = tickets.find((t) => `ticket-${t.id}` === item);
            if (!ticket) return null;
            return (
              <TicketCard
                id={item}
                key={item}
                ticket={ticket}
                disabled={isSortingContainer}
              />
            );
          })}
        </SortableContext>
      </div>
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid #e8e8e8",
          backgroundColor: "#fff",
        }}
      >
        <Button
          type="text"
          icon={<PlusOutlined />}
          size="small"
          style={{
            width: "100%",
            textAlign: "left",
            fontSize: "12px",
            height: "28px",
          }}
        >
          Add ticket
        </Button>
      </div>
    </div>
  );
};
