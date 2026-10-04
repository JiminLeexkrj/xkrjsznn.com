export type DossierEntry = {
  label: string;
  value: string;
  period?: string;
  /** 지금은 다루지 않는 과거 이력. 흐리게 표시된다. */
  past?: boolean;
};

export const profile = {
  name: { ko: "이지민", en: "Jimin Lukas Lee" },
  code: "xkrjsznn",
  role: "AI & full-stack developer",
  status: "아직 도달하는 중",
  // 위에서부터 이 순서로 보인다
  dossier: [
    { label: "School", value: "Korea University, Department of Data Science", period: "2026.03 –" },
    { label: "Affiliation", value: "GDGOC KU", period: "2026.08 –" },
    { label: "Based", value: "Seoul" },
    { label: "Born", value: "2006" },
    {
      label: "Origin",
      value: "Sunrin Internet High School, Information Security",
      period: "2022.03 – 2025.02",
      past: true,
    },
  ] satisfies DossierEntry[],
};
