import { createFileRoute } from "@tanstack/react-router";
import { ActivityDetail } from "../../screens/ActivityDetail";

export const Route = createFileRoute("/activities/$id")({
  component: ActivityDetailRoute,
});

function ActivityDetailRoute() {
  const { id } = Route.useParams();
  return <ActivityDetail id={Number(id)} />;
}
