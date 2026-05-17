import * as Dialog from "@radix-ui/react-dialog";
import { useProfile } from "../hooks/useProfile";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.1em] text-fg-3 font-medium">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SegmentControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded border border-line overflow-hidden"
      style={{ background: "var(--bg-2)" }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "px-3 py-1 text-[12px] transition-colors",
            value === opt.value ? "text-fg-0" : "text-fg-2 hover:text-fg-1",
          ].join(" ")}
          style={{
            background: value === opt.value ? "var(--bg-3)" : "transparent",
            border: "none",
            borderLeft: i > 0 ? "1px solid var(--line)" : "none",
            cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-fg-1">{label}</span>
      {children}
    </div>
  );
}

export function SettingsModal({ open, onOpenChange }: Props) {
  const { theme, toggle } = useTheme();
  const { data: settings } = useSettings();
  const { data: profile } = useProfile();
  const update = useUpdateSettings();

  const initials =
    profile?.fullName
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => onOpenChange(false)}
        />
        <Dialog.Content
          className="fixed z-50 rounded-md border border-line-soft"
          style={{
            background: "var(--bg-1)",
            boxShadow: "var(--shadow-soft), 0 16px 48px rgba(0,0,0,0.4)",
            width: 280,
            left: 212,
            bottom: 12,
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
            <Dialog.Title className="text-[13px] font-medium text-fg-0 m-0" style={{ lineHeight: 1 }}>
              Preferences
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-fg-3 hover:text-fg-1 transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <div className="px-4 py-4 space-y-5">
            {/* Account */}
            <Section label="Account">
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-md"
                style={{ background: "var(--bg-2)" }}
              >
                {/* Avatar */}
                <div
                  className="shrink-0 rounded-md overflow-hidden flex items-center justify-center text-[11px] font-semibold text-fg-2"
                  style={{ width: 32, height: 32, background: "var(--bg-3)" }}
                >
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: "cover" }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-fg-0 font-medium truncate leading-tight">
                    {profile?.fullName ?? "—"}
                  </div>
                  <div className="text-[11px] text-fg-3 truncate leading-tight mt-0.5">
                    {profile?.displayName ?? "Garmin Connect"}
                  </div>
                </div>
              </div>
            </Section>

            {/* Appearance */}
            <Section label="Appearance">
              <Row label="Theme">
                <SegmentControl
                  value={theme}
                  options={[
                    { value: "dark", label: "Dark" },
                    { value: "light", label: "Light" },
                  ]}
                  onChange={(v) => { if (v !== theme) toggle(); }}
                />
              </Row>
            </Section>

            {/* Sync */}
            <Section label="Sync">
              <Row label="Units">
                <SegmentControl
                  value={settings?.units ?? "metric"}
                  options={[
                    { value: "metric", label: "Metric" },
                    { value: "imperial", label: "Imperial" },
                  ]}
                  onChange={(v) => update.mutate({ units: v as "metric" | "imperial" })}
                />
              </Row>
            </Section>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t border-line-soft"
            style={{ background: "var(--bg-0)" }}
          >
            <span className="font-mono text-[10.5px] text-fg-3">Garmin Glow Up</span>
            <span className="font-mono text-[10.5px] text-fg-3">v0.1.0</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
