import { createFileRoute } from "@tanstack/react-router";
import { HealthView } from "../screens/HealthView";

export const Route = createFileRoute("/health")({
  component: HealthView,
});
