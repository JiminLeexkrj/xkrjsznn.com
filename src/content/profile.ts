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
  dossier: [
    { label: "소속", value: "GDGOC KU", period: "2026.08 –" },
    { label: "학교", value: "고려대학교 정보대학 데이터과학과", period: "2026.03 –" },
    { label: "기반", value: "Seoul" },
    { label: "출생", value: "2006" },
    {
      label: "출신",
      value: "선린인터넷고등학교 정보보호과",
      period: "2022.03 – 2025.02",
      past: true,
    },
  ] satisfies DossierEntry[],
};
