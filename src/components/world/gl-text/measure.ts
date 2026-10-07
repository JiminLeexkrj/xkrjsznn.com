import { STOPS } from "@/lib/timeline";
import { fontFor } from "./fonts";

// HTML 장면을 읽어 3D로 옮길 요소 목록을 만든다.
// 배치의 원본은 HTML이다. 반응형 레이아웃이 그대로 3D에 반영된다.
// 좌표는 장면(화면 한 장) 기준 px이다. transform을 무시하는 offset 값으로 재므로, 무대 이동이나 컷인 애니메이션 중에도 흔들리지 않는다.
//
// HTML에 붙이는 표시
//   data-gl-carrier="stele"  이 요소 안의 글을 바닥에서 솟은 석비에 새긴다
//   data-gl="floor"          글을 바닥에 눕혀 새긴다
//   data-gl-lines="off"      이 안의 구분선은 3D로 옮기지 않는다
//   data-z="1.5"             화면 위치는 그대로 두고 더 깊이(m) 둔다
//   data-domain="frost"      강조할 때의 영역 색
//   class="hover:wdth-112"   마우스를 올렸을 때 넓어질 폭. 3D에서도 같은 폭까지 넓어진다.
//   data-gl-effect="fracture" 마우스를 올리면 글이 띠로 갈라지며 공간이 금 가듯 일그러진 뒤 색이 바뀐다

export type Box = { x: number; y: number; w: number; h: number };
export type CarrierKind = "stele";
export type DomainName = "hollow" | "frost" | "ember";

type Base = {
  room: number;
  /** 화면 위치는 그대로 두고 이만큼 더 깊이(m) 둔다. 시차를 만든다. */
  z: number;
  /** 상호작용하는 요소(링크, 수상 줄)의 번호. 없으면 -1 */
  root: number;
  /** 새겨지는 석비의 번호. 없으면 -1 */
  block: number;
  domain: DomainName;
};

export type TextItem = Base & {
  kind: "text";
  box: Box;
  text: string;
  font: string;
  /** Archivo일 때 굵기와 폭 */
  archivo?: { weight: number; width: number };
  /** 마우스를 올렸을 때 넓어질 폭 */
  hoverWidth?: number;
  /** 마우스를 올렸을 때의 특수 효과 */
  effect?: "fracture";
  fontPx: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  opacity: number;
  align: "left" | "center" | "right";
  nowrap: boolean;
  vertical: boolean;
  /** 영역이 열릴 때의 컷인 종류 */
  cut: string | null;
  floor: boolean;
};

export type LineItem = Base & { kind: "line"; x1: number; x2: number; y: number; thickness: number; color: string; opacity: number };
export type SwatchItem = Base & { kind: "swatch"; box: Box; color: string };
export type HitItem = Base & { kind: "hit"; box: Box };
/** 글이 새겨지는 석비 */
export type CarrierItem = Base & { kind: "carrier"; box: Box; carrier: CarrierKind };
export type GLItem = TextItem | LineItem | SwatchItem | HitItem | CarrierItem;

export type Measured = { items: GLItem[]; roots: HTMLElement[]; width: number; height: number };

const CUTS = ["cut-name-a", "cut-name-b", "cut-drop", "cut-fade"];
const SWATCH: Record<string, string> = { gold: "#e9bd57", silver: "#d6d6d6", bronze: "#c98552" };

/** 장면 기준 offset 위치. 부모를 거슬러 올라가며 더한다. */
function offsetBox(el: HTMLElement, chamber: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== chamber) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function opacityWithin(el: HTMLElement, chamber: HTMLElement) {
  let o = 1;
  for (let node: HTMLElement | null = el; node && node !== chamber; node = node.parentElement) {
    o *= Number(getComputedStyle(node).opacity);
  }
  return o;
}

function directText(el: HTMLElement) {
  let text = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
  });
  return text.replace(/\s+/g, " ").trim();
}

function isHidden(el: HTMLElement, style: CSSStyleDeclaration) {
  return (
    // 화면에는 없고 스크린리더만 읽는 요소는 3D로 옮기지 않는다
    el.closest(".sr-only") !== null ||
    style.display === "none" ||
    style.visibility === "hidden" ||
    (el.offsetWidth === 0 && el.offsetHeight === 0)
  );
}

const px = (v: string) => parseFloat(v) || 0;

const domainOf = (el: HTMLElement) => (el.closest<HTMLElement>("[data-domain]")?.dataset.domain ?? "hollow") as DomainName;

/** 요소 자신이나 그룹 링크에 걸린 hover:wdth-NN / group-hover:wdth-NN */
function hoverWidthOf(el: HTMLElement) {
  const match = /(?:^|\s)(?:group-)?hover:wdth-(\d+)/.exec(el.getAttribute("class") ?? "");
  return match ? Number(match[1]) : undefined;
}

/**
 * 장면마다 보이지 않는 복제본을 만들어 잰다.
 * 컷인 애니메이션 중이거나 진입 전에 숨겨진 상태가 아닌 본래 모습을 얻고, 실제 화면은 건드리지 않는다.
 */
export function measureChambers(): Measured {
  const container = document.createElement("div");
  container.className = "stage";
  container.dataset.measureRoot = "";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);
  try {
    return measure(container);
  } finally {
    container.remove();
  }
}

function measure(container: HTMLElement): Measured {
  const items: GLItem[] = [];
  const roots: HTMLElement[] = [];
  const carriers: HTMLElement[] = [];

  STOPS.forEach((id, room) => {
    const original = document.getElementById(id);
    if (!original) return;
    const chamber = original.cloneNode(true) as HTMLElement;
    chamber.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    chamber.removeAttribute("style");
    container.appendChild(chamber);

    // 복제본의 요소와 실제 요소를 짝짓는다. 링크를 누르거나 초점을 볼 때는 실제 요소를 쓴다.
    const twin = new Map<Element, HTMLElement>();
    const a = document.createTreeWalker(chamber, NodeFilter.SHOW_ELEMENT);
    const b = document.createTreeWalker(original, NodeFilter.SHOW_ELEMENT);
    for (let x = a.nextNode(), y = b.nextNode(); x && y; x = a.nextNode(), y = b.nextNode()) twin.set(x as Element, y as HTMLElement);

    const rootOf = (el: HTMLElement, z: number) => {
      const rootClone = el.closest<HTMLElement>("a[href], [data-award-index]");
      const rootEl = rootClone && chamber.contains(rootClone) ? twin.get(rootClone) : undefined;
      if (!rootClone || !rootEl) return -1;
      let root = roots.indexOf(rootEl);
      if (root < 0) {
        root = roots.push(rootEl) - 1;
        items.push({ kind: "hit", room, z, root, block: -1, domain: domainOf(rootClone), box: offsetBox(rootClone, chamber) });
      }
      return root;
    };

    const walker = document.createTreeWalker(chamber, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode() as HTMLElement | null; node; node = walker.nextNode() as HTMLElement | null) {
      const el = node;
      const style = getComputedStyle(el);
      if (isHidden(el, style)) continue;

      const zAttr = el.closest<HTMLElement>("[data-z]")?.dataset.z;
      const z = zAttr ? Number(zAttr) : 0;
      const root = rootOf(el, z);
      const box = offsetBox(el, chamber);
      const domain = domainOf(el);

      // 석비. 바깥쪽 것이 먼저 나오므로 안쪽 요소들은 이미 등록된 석비를 찾는다.
      if (el.dataset.glCarrier) {
        carriers.push(el);
        items.push({ kind: "carrier", room, z, root: -1, block: carriers.length - 1, domain, box, carrier: "stele" });
      }
      const carrierEl = el.closest<HTMLElement>("[data-gl-carrier]");
      const block = carrierEl ? carriers.indexOf(carrierEl) : -1;

      // 가로 구분선. 석판 위에서는 파인 홈이 된다.
      if (!el.closest("[data-gl-lines='off']")) {
        for (const side of ["top", "bottom"] as const) {
          const width = px(style.getPropertyValue(`border-${side}-width`));
          if (width > 0 && style.getPropertyValue(`border-${side}-style`) !== "none") {
            items.push({
              kind: "line",
              room,
              z,
              root,
              block,
              domain,
              x1: box.x,
              x2: box.x + box.w,
              y: side === "top" ? box.y + width / 2 : box.y + box.h - width / 2,
              thickness: width,
              color: style.getPropertyValue(`border-${side}-color`),
              opacity: opacityWithin(el, chamber),
            });
          }
        }
      }

      if (el.dataset.glSwatch) {
        items.push({ kind: "swatch", room, z, root, block, domain, box, color: SWATCH[el.dataset.glSwatch] ?? "#d9d3c7" });
        continue;
      }

      let text = directText(el);
      if (!text) continue;
      if (style.textTransform === "uppercase") text = text.toUpperCase();

      const fontPx = px(style.fontSize);
      const lineHeightPx = style.lineHeight === "normal" ? fontPx * 1.2 : px(style.lineHeight);
      const vertical = style.writingMode.startsWith("vertical");
      const contentBox: Box = {
        x: box.x + px(style.paddingLeft) + px(style.borderLeftWidth),
        y: box.y + px(style.paddingTop) + px(style.borderTopWidth),
        w: box.w - px(style.paddingLeft) - px(style.paddingRight) - px(style.borderLeftWidth) - px(style.borderRightWidth),
        h: box.h - px(style.paddingTop) - px(style.paddingBottom) - px(style.borderTopWidth) - px(style.borderBottomWidth),
      };
      const chars = [...text.replace(/ /g, "")];
      const align = style.textAlign === "center" ? "center" : style.textAlign === "right" || style.textAlign === "end" ? "right" : "left";
      let cut: string | null = null;
      for (let n: HTMLElement | null = el; n && n !== chamber && !cut; n = n.parentElement) {
        cut = CUTS.find((c) => n!.classList.contains(c)) ?? null;
      }
      const font = fontFor(style, text);

      items.push({
        kind: "text",
        room,
        z,
        root,
        block,
        domain,
        box: contentBox,
        // 세로쓰기는 글자마다 줄을 바꿔 쌓는다
        text: vertical ? chars.join("\n") : text,
        font: font.url,
        archivo: font.archivo,
        hoverWidth: hoverWidthOf(el),
        effect: el.closest<HTMLElement>("[data-gl-effect]")?.dataset.glEffect === "fracture" ? "fracture" : undefined,
        fontPx,
        lineHeight: vertical ? contentBox.h / chars.length / fontPx : lineHeightPx / fontPx,
        letterSpacing: style.letterSpacing === "normal" || vertical ? 0 : px(style.letterSpacing) / fontPx,
        color: style.color,
        opacity: opacityWithin(el, chamber),
        align: vertical ? "center" : align,
        nowrap: style.whiteSpace === "nowrap" || contentBox.h < lineHeightPx * 1.5,
        vertical,
        cut,
        floor: Boolean(el.closest("[data-gl='floor']")),
      });
    }
  });

  return { items, roots, width: window.innerWidth, height: window.innerHeight };
}
