import { profile } from "@/content/profile";
import { Chamber } from "../Chamber";

export function Dossier() {
  return (
    <Chamber id="dossier" title="Dossier" mark="記録">
      <dl className="max-w-5xl border-t border-concrete">
        {profile.dossier.map((entry) => (
          <div
            key={entry.label}
            className={`grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1 border-b border-concrete py-6 md:grid-cols-[9rem_1fr_auto] md:items-baseline md:gap-x-6 md:py-8 ${
              entry.past ? "text-ash" : ""
            }`}
          >
            <dt className="text-sm text-ash md:text-base">{entry.label}</dt>
            <dd className="wdth-75 text-xl leading-tight font-semibold md:text-4xl">{entry.value}</dd>
            {entry.period && (
              <dd className="col-start-2 wdth-75 text-sm text-ash tabular-nums md:col-start-3 md:text-base">
                {entry.period}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </Chamber>
  );
}
