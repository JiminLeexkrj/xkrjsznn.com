export type Medal = "gold" | "silver" | "bronze";

export type Award = {
  event: string;
  /** 상 이름 그대로. 예: 대상, 금상, 은상 */
  prize: string;
  medal: Medal;
  year: number;
  /** 상세 설명. 앞으로 받을 상에만 작성한다. */
  detail?: string;
};

// 새 수상은 배열에 추가하면 된다. 화면에서는 연도 내림차순으로 정렬된다.
export const awards: Award[] = [
  { event: "SUNRIN IoT 아이디어 공모전", prize: "은상", medal: "silver", year: 2023 },
  { event: "SUNRIN 제로데이 공격 체험전", prize: "은상", medal: "silver", year: 2023 },
  { event: "SUNRIN IoT 아이디어 공모전", prize: "동상", medal: "bronze", year: 2022 },
];

/** 화면과 3D 홀이 같은 순서를 쓰도록 한곳에서 정렬한다 */
export const awardsByYear = () => [...awards].sort((a, b) => b.year - a.year);

/** 트로피룸에 앞으로 채울 빈 받침대 개수 */
export const reservedPlinths = 2;
