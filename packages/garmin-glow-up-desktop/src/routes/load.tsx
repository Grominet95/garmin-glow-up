import { createFileRoute } from "@tanstack/react-router";
import { TrainingLoad } from "../screens/TrainingLoad";

export const Route = createFileRoute("/load")({
  component: TrainingLoad,
});
