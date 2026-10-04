import { email, links } from "@/content/links";
import { profile } from "@/content/profile";
import { Chamber } from "../Chamber";
import { Logo } from "../Logo";

export function Contact() {
  return (
    <Chamber id="contact" title="Contact" mark="出口">
      <a
        href={`mailto:${email}`}
        className="self-start wdth-75 text-[clamp(1.75rem,6vw,5.5rem)] leading-none font-bold break-all transition-[font-variation-settings,color] duration-500 hover:wdth-110 hover:text-blood"
      >
        {email}
      </a>

      <ul className="mt-12 flex flex-col gap-4 md:mt-16 md:flex-row md:gap-16">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer" className="group flex flex-col">
              <span className="text-xl transition-colors group-hover:text-blood md:text-2xl">
                {link.label}
              </span>
              <span className="text-sm text-ash">{link.handle}</span>
            </a>
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex items-end justify-between gap-6 pt-24">
        <Logo className="text-[clamp(3rem,12vw,10rem)] text-concrete" />
        <p className="shrink-0 text-sm text-ash">
          © {new Date().getFullYear()} {profile.name.en}
        </p>
      </footer>
    </Chamber>
  );
}
