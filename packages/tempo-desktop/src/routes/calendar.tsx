import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "../screens/CalendarView";

export const Route = createFileRoute("/calendar")({
  component: CalendarView,
});
