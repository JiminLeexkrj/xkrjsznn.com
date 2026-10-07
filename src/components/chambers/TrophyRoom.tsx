import { awardsByYear } from "@/content/awards";
import { Chamber } from "../Chamber";
import { AwardRow } from "./AwardRow";

// 메달은 3D 홀에 전시되고, 대회 이름은 받침대에 새겨진다. 자세한 정보는 메달에 커서를 올리면 옆에 뜬다.
// 이 목록은 화면에 보이지 않고 스크린리더만 읽는다.
export function TrophyRoom() {
  const sorted = awardsByYear();

  return (
    <Chamber id="trophies" title="Trophies" mark="戦績" domain="ember">
      <ul className="sr-only">
        {sorted.map((award, index) => (
          <AwardRow key={`${award.event}-${award.year}-${award.prize}`} award={award} index={index} />
        ))}
      </ul>
    </Chamber>
  );
}
