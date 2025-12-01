import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { KanbanTicketCard } from "./KanbanTicketCard";
import { Ticket } from "../types";

interface KanbanColumnProps {
  id: string;
  columnId: number;
  name: string;
  items: string[];
  ticketMap: Record<string, Ticket>;
  onTicketClick?: (ticket: Ticket) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  columnId,
  name,
  items,
  ticketMap,
  onTicketClick,
}) => {
  const { setNodeRef } = useSortable({
    id,
    data: { type: "COLUMN", columnId },
    disabled: true,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col w-72 min-w-[18rem] max-w-[18rem] bg-slate-100 rounded-lg mr-3 h-full max-h-full border border-slate-200"
    >
      {/* Header */}
      <div className="p-2 flex items-center justify-between font-semibold text-slate-700 uppercase text-[11px] tracking-wider border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <span>{name}</span>
        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
          {items.length}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-1.5">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((itemId) => {
            const ticket = ticketMap[itemId];
            if (!ticket) return null;
            return (
              <KanbanTicketCard
                key={itemId}
                id={itemId}
                ticket={ticket}
                onClick={onTicketClick}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
};
