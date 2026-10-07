// troika-three-text는 dist/types에 타입을 두지만 package.json에 연결하지 않았다. 여기서 쓰는 것만 선언한다.
declare module "troika-three-text" {
  export function preloadFont(options: { font?: string; characters?: string | string[] }, callback: () => void): void;
}
