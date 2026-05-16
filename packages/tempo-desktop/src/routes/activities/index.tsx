import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "../../components/Skeleton";
import { TopBar } from "../../components/TopBar";
import { api } from "../../lib/api";

export const Route = createFileRoute("/activities/")({
  component: ActivitiesList,
});

const SPORT_META: Record<string, { color: string; emoji: string }> = {
  run: { color: "var(--run)", emoji: "🏃" },
  running: { color: "var(--run)", emoji: "🏃" },
  bike: { color: "var(--bike)", emoji: "🚴" },
  cycling: { color: "var(--bike)", emoji: "🚴" },
  swim: { color: "var(--swim)", emoji: "🏊" },
  swimming: { color: "var(--swim)", emoji: "🏊" },
  trail: { color: "var(--trail)", emoji: "⛰️" },
  trail_running: { color: "var(--trail)", emoji: "⛰️" },
  lift: { color: "var(--lift)", emoji: "🏋️" },
  strength: { color: "var(--lift)", emoji: "🏋️" },
  strength_training: { color: "var(--lift)", emoji: "🏋️" },
  walk: { color: "var(--walk)", emoji: "🚶" },
  walking: { color: "var(--walk)", emoji: "🚶" },
  hike: { color: "var(--walk)", emoji: "🥾" },
  hiking: { color: "var(--walk)", emoji: "🥾" },
};

const UNCOUNTED_SPORTS = new Set(["hike", "hiking", "walk", "walking"]);

function getSportMeta(sport: string) {
  return SPORT_META[sport.toLowerCase()] ?? { color: "var(--fg-3)", emoji: "🏅" };
}

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(mondayStr: string): string {
  const monday = new Date(mondayStr);
  const sunday = new Date(mondayStr);
  sunday.setDate(sunday.getDate() + 6);
  const fmtDay = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric" });
  const fmtFull = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  if (monday.getMonth() === sunday.getMonth()) {
    return `${fmtDay(monday)} – ${fmtFull(sunday)}`;
  }
  return `${fmtFull(monday)} – ${fmtFull(sunday)}`;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function tssColor(tss: number): string {
  if (tss < 50) return "var(--z2)";
  if (tss < 100) return "var(--z3)";
  if (tss < 150) return "var(--z4)";
  return "var(--z5)";
}

interface Activity {
  id: number;
  sport: string;
  startTimeLocal: string;
  title: string;
  distanceKm: number;
  avgHr: number;
  avgPaceDisplay: string;
  tss: number;
}

function WeekLoadBar({ tss, maxTss }: { tss: number; maxTss: number }) {
  const pct = Math.min((tss / Math.max(maxTss, 1)) * 100, 100);
  const color = tssColor(tss / Math.max(1, 1));
  return (
    <div className="flex-1 h-1 rounded-full bg-bg-3 overflow-hidden max-w-24">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--z2), ${color})` }}
      />
    </div>
  );
}

function StatPill({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-end">
      <span
        className="text-[15px] font-[650] tracking-[-0.02em] num leading-none"
        style={{ color: color ?? "var(--fg-0)" }}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.08em] text-fg-3 font-medium mt-0.5">
        {label}
      </span>
    </div>
  );
}

function ActivitiesList() {
  const { data, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api<{ items: Activity[]; nextCursor: string | null }>("/activities"),
  });

  const weeks = (() => {
    if (!data?.items) return [];
    const map = new Map<string, Activity[]>();
    for (const act of data.items) {
      const key = getMondayOf(act.startTimeLocal);
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(act);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const maxWeekTss = Math.max(...weeks.map(([, acts]) => acts.reduce((s, a) => s + a.tss, 0)), 1);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Activities"]} />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ))}

        {weeks.map(([monday, acts]) => {
          const trainingSessions = acts.filter((a) => !UNCOUNTED_SPORTS.has(a.sport.toLowerCase()));
          const totalTss = Math.round(trainingSessions.reduce((s, a) => s + a.tss, 0));
          const totalKm = trainingSessions.reduce((s, a) => s + a.distanceKm, 0);

          return (
            <div key={monday}>
              {/* Week header */}
              <div className="flex items-center gap-3 mb-3 px-1">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-fg-3 font-medium m-0 mb-0.5">
                    Semaine
                  </p>
                  <h2 className="text-[16px] font-[650] tracking-[-0.025em] text-fg-0 m-0 leading-none">
                    {formatWeekRange(monday)}
                  </h2>
                </div>

                <WeekLoadBar tss={totalTss} maxTss={maxWeekTss} />

                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {totalKm > 0 && (
                    <span className="chip font-mono text-fg-1">{totalKm.toFixed(0)} km</span>
                  )}
                  <span
                    className="chip font-mono font-[600]"
                    style={{
                      color: tssColor(totalTss / acts.length),
                      borderColor: `color-mix(in oklch, ${tssColor(totalTss / acts.length)} 35%, transparent)`,
                    }}
                  >
                    {totalTss} TSS
                  </span>
                  <span className="chip text-fg-3">
                    {trainingSessions.length} séance{trainingSessions.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Activity cards */}
              <div className="space-y-1.5">
                {acts.map((act) => {
                  const meta = getSportMeta(act.sport);
                  const tss = Math.round(act.tss);
                  const hasPace =
                    act.avgPaceDisplay && act.avgPaceDisplay !== "--" && act.avgPaceDisplay !== "";

                  return (
                    <Link
                      key={act.id}
                      to="/activities/$id"
                      params={{ id: String(act.id) }}
                      className="card flex items-center gap-4 no-underline transition-all hover:bg-bg-2 hover:scale-[1.002] active:scale-[0.999]"
                      style={{ borderLeft: `3px solid ${meta.color}`, paddingLeft: "14px" }}
                    >
                      {/* Sport badge */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] shrink-0"
                        style={{
                          background: `color-mix(in oklch, ${meta.color} 12%, var(--bg-2))`,
                        }}
                      >
                        {meta.emoji}
                      </div>

                      {/* Title + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-[600] text-fg-0 tracking-[-0.015em] truncate m-0 leading-snug">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-fg-3 m-0 mt-0.5 capitalize">
                          {formatDay(act.startTimeLocal)}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 shrink-0">
                        {act.distanceKm > 0 && (
                          <StatPill value={act.distanceKm.toFixed(2)} label="km" />
                        )}
                        {hasPace && (
                          <StatPill value={act.avgPaceDisplay} label="allure" color="var(--fg-1)" />
                        )}
                        {act.avgHr > 0 && (
                          <StatPill value={String(act.avgHr)} label="bpm" color="var(--z4)" />
                        )}

                        {/* TSS badge */}
                        <div
                          className="px-2.5 py-1.5 rounded-lg text-[13px] font-mono font-[700] num min-w-[44px] text-center"
                          style={{
                            background: `color-mix(in oklch, ${tssColor(tss)} 10%, var(--bg-2))`,
                            color: tssColor(tss),
                            border: `1px solid color-mix(in oklch, ${tssColor(tss)} 20%, transparent)`,
                          }}
                        >
                          {tss}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
