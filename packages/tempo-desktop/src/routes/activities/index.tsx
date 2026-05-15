import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "../../components/Skeleton";
import { TopBar } from "../../components/TopBar";
import { api } from "../../lib/api";

export const Route = createFileRoute("/activities/")({
  component: ActivitiesList,
});

function ActivitiesList() {
  const { data, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () =>
      api<{
        items: Array<{
          id: number;
          sport: string;
          startTimeLocal: string;
          title: string;
          distanceKm: number;
          avgHr: number;
          avgPaceDisplay: string;
          tss: number;
        }>;
        nextCursor: string | null;
      }>("/activities"),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Activities"]} />
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        {data?.items.map((act) => (
          <Link
            key={act.id}
            to="/activities/$id"
            params={{ id: String(act.id) }}
            className="card flex items-center gap-4 no-underline hover:bg-bg-2 transition-colors"
          >
            <div>
              <div className="text-[13px] font-medium text-fg-0">{act.title}</div>
              <div className="text-[11px] text-fg-2 font-mono">
                {act.startTimeLocal.slice(0, 10)} · {act.distanceKm.toFixed(2)} km ·{" "}
                {act.avgPaceDisplay} · {act.avgHr} bpm
              </div>
            </div>
            <div className="ml-auto text-[11px] font-mono text-fg-3">{Math.round(act.tss)} TSS</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
