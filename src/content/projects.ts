export type Project = {
  title: string;
  /** GitHub 또는 YouTube 주소. 클릭하면 이 주소로 이동한다. */
  href: string;
  /** 상징 색. 마우스를 올리면 Works 방의 기둥 몇 개에 이 색의 빛이 피어오른다. */
  color: string;
  summary?: string;
  stack?: string[];
  year?: number;
};

// 위에 있을수록 먼저 보인다. 새 프로젝트는 배열에 추가하면 된다.
export const projects: Project[] = [
  {
    title: "Forain",
    href: "https://github.com/JiminLeexkrj/Forain",
    color: "#3fd68f",
  },
  {
    title: "Static Routing Simulator",
    href: "https://github.com/JiminLeexkrj/StaticRoutingSimulator",
    color: "#e5484d",
  },
];
