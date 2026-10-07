import { email, links } from "@/content/links";
import { profile } from "@/content/profile";
import { Chamber } from "../Chamber";
import { Logo } from "../Logo";

// 마지막 방에서는 세 영역이 만난다. 글은 세 고리가 감싸는 원의 한가운데에 선다.
// 연락처마다 다른 영역의 색으로 반응한다.
const LINK_DOMAINS = ["frost", "ember", "hollow"] as const;

export function Contact() {
  return (
    <Chamber id="contact" title="Contact" mark="出口" domain="hollow" centered>
      {/* 3D에서는 마우스를 올리면 공간이 금 가듯 일그러졌다가 영역의 색으로 바뀐다 */}
      <a
        href={`mailto:${email}`}
        data-gl-effect="fracture"
        className="wdth-75 text-[clamp(1.75rem,6vw,5.5rem)] leading-none font-bold break-all transition-colors duration-500 hover:text-domain"
      >
        {email}
      </a>

      <ul className="mt-8 flex flex-col items-center gap-4 md:mt-12 md:flex-row md:gap-16">
        {links.map((link, i) => (
          <li key={link.href} data-domain={LINK_DOMAINS[i % LINK_DOMAINS.length]}>
            <a href={link.href} target="_blank" rel="noreferrer" className="group flex flex-col items-center">
              <span className="text-xl transition-colors group-hover:text-domain md:text-2xl">{link.label}</span>
              <span className="text-sm text-ash">{link.handle}</span>
            </a>
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex w-full items-end justify-between gap-6 pt-10 text-left">
        <Logo className="text-[clamp(3rem,12vw,10rem)] text-concrete" />
        <p className="shrink-0 text-sm text-ash">
          © {new Date().getFullYear()} {profile.name.en}
        </p>
      </footer>
    </Chamber>
  );
}
