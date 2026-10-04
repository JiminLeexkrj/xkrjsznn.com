import { awardsByYear, reservedPlinths } from "@/content/awards";
import { Chamber } from "../Chamber";
import { AwardRow } from "./AwardRow";

// 메달은 3D 홀에 전시된다. 여기에는 박물관 라벨처럼 작은 목록만 둔다.
export function TrophyRoom() {
  const sorted = awardsByYear();

  return (
    <Chamber id="trophies" title="Trophies" mark="戦績">
      <div className="mt-auto max-w-xl">
        <ul className="border-t border-concrete">
          {sorted.map((award, index) => (
            <AwardRow key={`${award.event}-${award.year}-${award.prize}`} award={award} index={index} />
          ))}
        </ul>
        {reservedPlinths > 0 && (
          <p lang="ko" className="mt-4 font-ko text-sm text-ash">
            빈 받침대 {reservedPlinths}개는 다음 수상을 위해 남겨 두었습니다.
          </p>
        )}
      </div>
    </Chamber>
  );
}
