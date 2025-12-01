import React, { useMemo } from "react";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { Ticket, Column } from "../types";
import { Spin } from "antd";

interface KanbanBoardProps {
  tickets: Ticket[];
  columns: Column[];
  loading?: boolean;
  onTicketClick?: (ticket: Ticket) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  columns,
  loading,
  onTicketClick,
}) => {
  // Group tickets by column
  const { columnsWithTickets, ticketMap } = useMemo(() => {
    const tMap: Record<string, Ticket> = {};
    const colMap: Record<number, string[]> = {};

    // Ensure columns is an array
    const safeColumns = Array.isArray(columns) ? columns : [];

    // Initialize columns
    safeColumns.forEach((col) => {
      colMap[col.id] = [];
    });

    tickets.forEach((ticket) => {
      tMap[ticket.id.toString()] = ticket;
      if (colMap[ticket.column]) {
        colMap[ticket.column].push(ticket.id.toString());
      }
    });

    return {
      columnsWithTickets: safeColumns.map((col) => ({
        ...col,
        items: colMap[col.id] || [],
      })),
      ticketMap: tMap,
    };
  }, [tickets, columns]);

  const columnIds = useMemo(
    () => (Array.isArray(columns) ? columns : []).map((c) => `column-${c.id}`),
    [columns]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <DndContext>
      <div className="flex h-[calc(100vh-200px)] overflow-x-auto pb-4">
        <SortableContext
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          {columnsWithTickets.map((col) => (
            <KanbanColumn
              key={col.id}
              id={`column-${col.id}`}
              columnId={col.id}
              name={col.name}
              items={col.items}
              ticketMap={ticketMap}
              onTicketClick={onTicketClick}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};
