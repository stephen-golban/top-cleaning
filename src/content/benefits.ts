import type { LocalizedText } from "./types";

/**
 * Why work with Top Cleaning — six benefits.
 *
 * RO and RU are verbatim from the previous site's `About.items` (see
 * `.agents/source-inventory.md` §4 and §5). EN is net-new.
 *
 * The old About page iterated the *services* collection to render these, so it
 * only ever showed the first four and items 5 and 6 were written but dead
 * (source inventory §11, bug 1). All six are here and all six ship.
 */
export const benefitIds = [
  "timeSaved",
  "oneProvider",
  "professionalTeam",
  "individualApproach",
  "equipment",
  "quality",
] as const;

export type BenefitId = (typeof benefitIds)[number];

export interface Benefit {
  readonly id: BenefitId;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
}

export const benefits: readonly [Benefit, Benefit, Benefit, Benefit, Benefit, Benefit] =
  [
    {
      id: "timeSaved",
      title: {
        ro: "Economie de timp",
        ru: "Экономия времени",
        en: "Time saved",
      },
      description: {
        ro: "Salvează timp prețios lăsându-ne pe noi să ne ocupăm de curățenie. În fiecare săptămână, îți oferim mai mult timp pentru activitățile care contează cu adevărat.",
        ru: "Сэкономьте драгоценное время, доверив уборку нам. Каждую неделю мы предоставляем вам больше времени для занятий, которые действительно важны.",
        en: "Hand the cleaning over and get the hours back. Every week, that is time returned to the things that actually matter to you.",
      },
    },
    {
      id: "oneProvider",
      title: {
        ro: "O singură adresă pentru toate soluțiile",
        ru: "Один адрес для всех решений",
        en: "One place for the whole list",
      },
      description: {
        ro: "Noi suntem partenerul tău de încredere pentru întreținerea casei sau biroului. Oferim o gamă variată de servicii, astfel încât să rezolvăm toate necesitățile tale într-un singur loc.",
        ru: "Мы — ваш надежный партнер по уходу за домом или офисом. Предлагаем широкий спектр услуг, чтобы удовлетворить все ваши потребности в одном месте.",
        en: "We look after homes and offices alike, and we cover a wide enough range of work that one call handles everything — no lining up a different contractor for each job.",
      },
    },
    {
      id: "professionalTeam",
      title: {
        ro: "Echipă profesionistă",
        ru: "Профессиональная команда",
        en: "A professional team",
      },
      description: {
        ro: "Specialiștii noștri sunt bine pregătiți și experimentați, asigurând servicii de curățenie la cele mai înalte standarde. Ne prezentăm mereu la timp și lucrăm cu respect și responsabilitate.",
        ru: "Наши специалисты хорошо подготовлены и опытны, обеспечивая услуги уборки на самом высоком уровне. Мы всегда вовремя и работаем с уважением и ответственностью.",
        en: "Our cleaners are trained and experienced, and they work to the same standard every visit. We arrive when we said we would, and we treat your home the way we would treat our own.",
      },
    },
    {
      id: "individualApproach",
      title: {
        ro: "Abordare individuală",
        ru: "Индивидуальный подход",
        en: "Built around your place",
      },
      description: {
        ro: "Adaptăm serviciile noastre la nevoile și preferințele tale specifice. Fiecare client beneficiază de o soluție personalizată, care se potrivește perfect bugetului și cerințelor sale.",
        ru: "Мы адаптируем наши услуги к вашим конкретным потребностям и предпочтениям. Каждый клиент получает персонализированное решение, идеально подходящее по бюджету и требованиям.",
        en: "We fit the work to your space and your preferences. Every client gets a plan shaped by what actually needs doing and what the budget allows.",
      },
    },
    {
      id: "equipment",
      title: {
        ro: "Tehnologii performante",
        ru: "Современные технологии",
        en: "Equipment that does the job",
      },
      description: {
        ro: "Utilizăm echipamente și produse de curățenie de ultimă generație, eficiente și sigure pentru tine și familia ta. Ne asigurăm că suprafețele tratate sunt curățate impecabil fără a fi deteriorate.",
        ru: "Мы используем новейшее оборудование и чистящие средства, которые эффективны и безопасны для вас и вашей семьи. Мы гарантируем, что обрабатываемые поверхности будут очищены идеально без повреждений.",
        en: "We bring current professional equipment and cleaning products — effective, and safe to use around your family. Surfaces come out properly clean and undamaged.",
      },
    },
    {
      id: "quality",
      title: {
        ro: "Servicii de calitate",
        ru: "Качественные услуги",
        en: "A result you can count on",
      },
      description: {
        ro: "Respectăm cele mai înalte standarde de calitate, oferind de fiecare dată servicii optime. Echipa noastră calificată, tehnologiile avansate și atitudinea profesionistă garantează satisfacția clienților noștri.",
        ru: "Мы придерживаемся самых высоких стандартов качества, каждый раз предоставляя оптимальные услуги. Наша квалифицированная команда, передовые технологии и профессиональный подход гарантируют удовлетворение наших клиентов.",
        en: "We hold to the same standard on every job. Trained people, the right equipment and a professional attitude are what make the result predictable rather than lucky.",
      },
    },
  ];
