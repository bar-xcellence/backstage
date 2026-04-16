"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { updateEventStatus } from "@/actions/events";

interface EventRow {
  id: string;
  eventName: string;
  showName: string | null;
  eventDate: string;
  venueName: string;
  guestCount: number;
  status: string;
  lcSentAt: Date | null;
}

const COLUMNS = [
  { id: "enquiry", label: "ENQUIRY" },
  { id: "confirmed", label: "CONFIRMED" },
  { id: "preparation", label: "PREPARATION" },
  { id: "ready", label: "READY" },
  { id: "delivered", label: "DELIVERED" },
];

const STATUS_ACCENT: Record<string, string> = {
  enquiry: "border-l-grey",
  confirmed: "border-l-cognac",
  preparation: "border-l-gold",
  ready: "border-l-botanical",
  delivered: "border-l-success",
};

export function EventKanban({ events }: { events: EventRow[] }) {
  const [items, setItems] = useState(
    events.filter((e) => e.status !== "cancelled")
  );

  if (events.length === 0) return null;

  function getColumnEvents(columnId: string) {
    return items.filter((e) => e.status === columnId);
  }

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStatus = destination.droppableId;
    const event = items.find((e) => e.id === draggableId);
    if (!event || event.status === newStatus) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((e) => (e.id === draggableId ? { ...e, status: newStatus } : e))
    );

    try {
      await updateEventStatus(draggableId, newStatus);
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((e) =>
          e.id === draggableId ? { ...e, status: event.status } : e
        )
      );
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colEvents = getColumnEvents(col.id);
          return (
            <div key={col.id} className="min-w-[240px] shrink-0 flex-1">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase text-grey">
                  {col.label}
                </span>
                <span className="font-[family-name:var(--font-raleway)] text-[11px] font-medium text-grey/60">
                  {colEvents.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] space-y-2 p-2 transition-colors duration-200 ${
                      snapshot.isDraggingOver
                        ? "bg-gold/5"
                        : colEvents.length === 0
                          ? "bg-surface-low"
                          : ""
                    }`}
                  >
                    {colEvents.map((event, index) => (
                      <Draggable
                        key={event.id}
                        draggableId={event.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-cream border border-outline p-3 border-l-4 ${STATUS_ACCENT[event.status] || "border-l-grey"} transition-shadow duration-200 ${
                              snapshot.isDragging
                                ? "shadow-[0px_20px_40px_rgba(30,31,46,0.12)] opacity-90"
                                : ""
                            }`}
                          >
                            <Link
                              href={`/events/${event.id}`}
                              className="block"
                            >
                              <h3 className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-charcoal leading-tight">
                                {event.eventName}
                              </h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.12em] uppercase text-grey">
                                <span>{event.eventDate}</span>
                                <span>{event.guestCount} guests</span>
                              </div>
                              {event.lcSentAt && (
                                <span className="inline-block mt-2 text-[10px] font-medium tracking-[0.16em] uppercase text-success">
                                  SENT TO LC
                                </span>
                              )}
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
