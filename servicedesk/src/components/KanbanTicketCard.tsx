import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TicketCard from "./TicketCard";
import { Ticket } from "../types";

interface KanbanTicketCardProps {
  id: string;
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
}

export const KanbanTicketCard: React.FC<KanbanTicketCardProps> = ({
  id,
  ticket,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "TICKET",
      ticket,
    },
    disabled: true, // Read-only: disable dragging
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-ticket-card-wrapper"
    >
      <TicketCard ticket={ticket} onClick={() => onClick?.(ticket)} />
    </div>
  );
};
