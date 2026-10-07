import { profile } from "@/content/profile";
import { Chamber } from "../Chamber";

export function Dossier() {
  return (
    <Chamber id="dossier" title="Dossier" mark="記録" domain="hollow">
      {/* 기록(記録)이므로 이 방에서만 글이 돌에 새겨진다. 바닥에서 솟은 석비이고, 구분선은 파인 홈이 된다. */}
      <dl data-gl-carrier="stele" className="max-w-5xl border-t border-concrete">
        {profile.dossier.map((entry) => (
          <div
            key={entry.label}
            className={`grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1 border-b border-concrete py-4 md:grid-cols-[9rem_1fr_auto] md:items-baseline md:gap-x-6 md:py-5 ${
              entry.past ? "text-ash" : ""
            }`}
          >
            <dt className="text-sm text-ash md:text-base">{entry.label}</dt>
            <dd className="wdth-75 text-xl leading-tight font-semibold md:text-3xl">{entry.value}</dd>
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
