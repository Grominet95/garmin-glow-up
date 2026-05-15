import { createFileRoute } from "@tanstack/react-router";
import { ProgressView } from "../screens/ProgressView";

export const Route = createFileRoute("/progress")({
  component: ProgressView,
});
