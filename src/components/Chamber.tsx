import { VerticalMark } from "./VerticalMark";

type ChamberProps = {
  id: string;
  title: string;
  mark: string;
  children: React.ReactNode;
};

// 영역 안의 방 하나. 3D 공간이 붙기 전에도 이 구조만으로 모든 정보가 읽힌다.
export function Chamber({ id, title, mark, children }: ChamberProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative flex min-h-svh scroll-mt-0 flex-col px-4 pt-28 pb-20 md:px-10 md:pt-36"
    >
      <VerticalMark>{mark}</VerticalMark>
      <h2
        id={`${id}-title`}
        className="recede wdth-62 text-[clamp(3.5rem,13vw,11rem)] leading-[0.82] font-black text-dust"
      >
        {title}
      </h2>
      <div className="mt-12 flex flex-1 flex-col md:mt-20">{children}</div>
    </section>
  );
}
