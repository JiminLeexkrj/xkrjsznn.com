import { Logo } from "./Logo";

const chambers = [
  { id: "dossier", label: "Dossier" },
  { id: "works", label: "Works" },
  { id: "trophies", label: "Trophies" },
  { id: "contact", label: "Contact" },
];

export function Frame() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-4 pt-5 mix-blend-difference md:px-10 md:pt-8">
      <a href="#identity" aria-label="처음으로">
        <Logo className="text-2xl md:text-3xl" />
      </a>
      <nav aria-label="장면">
        <ul className="flex gap-4 text-sm md:gap-8 md:text-base">
          {chambers.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className="wdth-75 transition-[font-variation-settings,color] duration-300 hover:wdth-125 hover:text-blood"
              >
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
