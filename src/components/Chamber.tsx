import { VerticalMark } from "./VerticalMark";

type ChamberProps = {
  id: string;
  title: string;
  mark: string;
  /** 이 방이 속한 영역. 강조와 상호작용의 색이 된다. */
  domain: "hollow" | "frost" | "ember";
  /** 가운데 정렬. 시선의 중심에 놓여 마우스로 둘러봐도 거의 움직이지 않는다. */
  centered?: boolean;
  children: React.ReactNode;
};

// 영역 안의 방 하나. 무대 방식에서는 화면 한 장에 고정되므로 한 화면 안에 들어오게 짠다.
export function Chamber({ id, title, mark, domain, centered = false, children }: ChamberProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-domain={domain}
      className={`chamber relative flex min-h-svh flex-col px-4 pt-24 pb-10 md:px-10 md:pt-28 md:pb-12 ${
        centered ? "items-center text-center" : ""
      }`}
    >
      <VerticalMark>{mark}</VerticalMark>
      {/* data-z: 3D 공간에서 화면 위치는 그대로 두고 더 깊이 둔다(m). 시차가 생긴다. */}
      <h2
        id={`${id}-title`}
        data-z="1.4"
        className="recede wdth-62 text-[clamp(3rem,9vw,8.5rem)] leading-[0.82] font-black text-dust"
      >
        {title}
      </h2>
      <div className={`mt-8 flex flex-1 flex-col md:mt-12 ${centered ? "w-full items-center" : ""}`}>{children}</div>
    </section>
  );
}
