import { profile } from "@/content/profile";
import { Chamber } from "../Chamber";

export function Dossier() {
  return (
    <Chamber id="dossier" title="Dossier" mark="記録">
      <dl className="max-w-5xl border-t border-concrete">
        {profile.dossier.map((entry) => (
          <div
            key={entry.label}
            className={`grid grid-cols-[4rem_1fr] gap-x-6 gap-y-1 border-b border-concrete py-6 md:grid-cols-[8rem_1fr_auto] md:items-baseline md:py-8 ${
              entry.past ? "text-ash" : ""
            }`}
          >
            <dt lang="ko" className="font-ko text-sm text-ash md:text-base">
              {entry.label}
            </dt>
            <dd lang="ko" className="font-ko text-xl font-bold md:text-4xl">
              {entry.value}
            </dd>
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
