import type { ImageSlotId } from "./images";
import type { Localized, LocalizedText, NonEmpty } from "./types";
import type { Locale } from "@/i18n/routing";

/**
 * The four services Top Cleaning offers.
 *
 * RO and RU copy is the client's own, reproduced verbatim from the previous
 * site (`.agents/source-inventory.md` §4 and §6); the `<li>` wrappers the old
 * message files carried are markup, not copy, and are dropped here. EN is
 * net-new, written for this rewrite.
 *
 * Every localized field is a `Localized<…>` record, so a locale can never be
 * missed. Inclusion lists are lists of localized lines rather than localized
 * lists, which makes it structurally impossible for one language to end up with
 * more or fewer operations than another.
 */
export const serviceIds = [
  "general",
  "maintenance",
  "afterRenovation",
  "upholstery",
] as const;

export type ServiceId = (typeof serviceIds)[number];

export interface Service {
  /** Stable, locale-independent identifier. Used for message keys and JSON-LD. */
  readonly id: ServiceId;
  /** URL segment under the services index, localized per locale. */
  readonly slug: LocalizedText;
  /** Photography slot used by the card and the detail page hero. */
  readonly image: ImageSlotId;
  /** Service name, as a heading. */
  readonly name: LocalizedText;
  /** One-paragraph blurb for cards and listings. */
  readonly summary: LocalizedText;
  /** Longer introduction shown at the top of the detail page. */
  readonly intro: LocalizedText;
  /** Every operation the service covers, in the order the client listed them. */
  readonly included: NonEmpty<LocalizedText>;
}

const general: Service = {
  id: "general",
  slug: {
    ro: "curatenie-generala",
    ru: "generalnaya-uborka",
    en: "deep-cleaning",
  },
  image: "serviceGeneral",
  name: {
    ro: "Curățenie generală",
    ru: "Генеральная уборка",
    en: "Deep cleaning",
  },
  summary: {
    ro: "Curățenie generală completă pentru a reîmprospăta locuința ta. Tehnici și echipamente avansate pentru o curățenie profundă.",
    ru: "Полная генеральная уборка для освежения вашего жилья. Продвинутые техники и оборудование для глубокой чистки.",
    en: "A full top-to-bottom clean for when a home needs resetting. We work room by room, in detail, with professional equipment.",
  },
  intro: {
    ro: "Când simți că ai nevoie de o reîmprospătare și vrei să îți revigorezi energia, începe cu o curățenie profundă a locurilor unde petreci cel mai mult timp: acasă și la birou. Spre deosebire de curățenia de întreținere, curățenia generală se efectuează la nevoie – periodic, cu prilejuri speciale sau ori de câte ori consideri necesar. Aceasta se concentrează pe detalii și revitalizează atmosfera fiecărei camere.",
    ru: "Когда чувствуешь потребность в обновлении и хочешь зарядиться новой энергией, начни с генеральной уборки в местах, где проводишь больше всего времени: дома и на работе. В отличие от поддерживающей уборки, генеральная уборка проводится по мере необходимости — сезонно, по особым случаям или когда считаешь нужным. Она сосредоточена на деталях и освежает атмосферу в каждой комнате.",
    en: "When a place needs resetting, start with the rooms you spend the most time in — at home and at the office. Unlike regular cleaning, a deep clean happens when you need it: seasonally, around an occasion, or whenever the place has stopped feeling fresh. It goes after the detail work, and that is what changes how a room feels.",
  },
  included: [
    {
      ro: "Spălarea exterioară a frigiderului, cuptorului și cuptorului cu microunde",
      ru: "Мойка внешней поверхности холодильника, духовки и микроволновой печи",
      en: "Washing the outside of the fridge, oven and microwave",
    },
    {
      ro: "Curățarea suprafețelor de gătit",
      ru: "Очистка кухонных поверхностей",
      en: "Cleaning the cooking surfaces",
    },
    {
      ro: "Îndepărtarea prafului de pe decorațiuni (tablouri, vaze etc.), electrocasnice, becuri, uși etc.",
      ru: "Удаление пыли с декораций (картины, вазы и т.д.), бытовой техники, ламп, дверей и т.д.",
      en: "Dusting décor (pictures, vases and the like), appliances, light fittings and doors",
    },
    {
      ro: "Spălarea podelelor",
      ru: "Мытье полов",
      en: "Washing the floors",
    },
    {
      ro: "Curățarea oglinzilor și a altor suprafețe de sticlă (exceptând ferestrele)",
      ru: "Очистка зеркал и других стеклянных поверхностей (кроме окон)",
      en: "Cleaning mirrors and other glass surfaces (windows excluded)",
    },
    {
      ro: "Îndepărtarea calcarului și a depunerilor de piatră din baie și toaletă",
      ru: "Удаление известкового налета и отложений в ванной и туалете",
      en: "Removing limescale and mineral deposits in the bathroom and toilet",
    },
    {
      ro: "Spălarea integrală a gresiei și faianței din baie și toaletă",
      ru: "Полная мойка плитки и керамической плитки в ванной и туалете",
      en: "Washing the bathroom and toilet tiling in full",
    },
    {
      ro: "Curățarea mobilierului (rafturi, dulapuri, noptiere etc.)",
      ru: "Очистка мебели (полки, шкафы, тумбочки и т.д.)",
      en: "Cleaning the furniture (shelves, cupboards, bedside tables and so on)",
    },
    {
      ro: "Curățarea și dezinfectarea obiectelor sanitare (robinete, lavoare, bideuri etc.)",
      ru: "Очистка и дезинфекция сантехники (краны, раковины, биде и т.д.)",
      en: "Cleaning and disinfecting sanitary fittings (taps, basins, bidets and so on)",
    },
    {
      ro: "Aspirarea podelelor, covoarelor, mobilierului tapițat, canapelelor și fotoliilor",
      ru: "Пылесоска полов, ковров, мягкой мебели, диванов и кресел",
      en: "Vacuuming floors, rugs, upholstered furniture, sofas and armchairs",
    },
    {
      ro: "Îndepărtarea prafului și grăsimii de pe hota de bucătărie",
      ru: "Удаление пыли и жира с кухонной вытяжки",
      en: "Removing dust and grease from the kitchen extractor hood",
    },
    {
      ro: "Spălarea aragazului și eliminarea urmelor de grăsime",
      ru: "Мытье плиты и удаление следов жира",
      en: "Washing the hob and clearing grease marks",
    },
    {
      ro: "Spălarea coșurilor de gunoi și a zonelor de depozitare a deșeurilor",
      ru: "Мытье мусорных ведер и зон для хранения отходов",
      en: "Washing the bins and the waste storage area",
    },
  ],
};

const maintenance: Service = {
  id: "maintenance",
  slug: {
    ro: "curatenie-de-intretinere",
    ru: "podderzhivayushchaya-uborka",
    en: "regular-cleaning",
  },
  image: "serviceMaintenance",
  name: {
    ro: "Curățenie de întreținere",
    ru: "Поддерживающая уборка",
    en: "Regular cleaning",
  },
  summary: {
    ro: "Locuință curată săptămânal cu serviciile noastre de curățenie. Bucură-te de o casă strălucitoare și confortabilă.",
    ru: "Еженедельная чистка вашего жилья с нашими услугами уборки. Наслаждайтесь блестящим и уютным домом.",
    en: "Regular visits that stop dust and grease building up, so the place stays comfortable week to week.",
  },
  intro: {
    ro: "Menținerea curățeniei este crucială pentru a asigura un mediu curat și sănătos în locuința ta. Aceasta se efectuează constant și previne acumularea murdăriei și a prafului, garantând un spațiu mereu plăcut și igienic.",
    ru: "Поддерживающая уборка важна для поддержания чистоты и здоровья в вашем доме. Она проводится регулярно и помогает предотвратить накопление грязи и пыли, обеспечивая всегда уютное и гигиеничное пространство.",
    en: "Regular cleaning is what keeps a home from ever needing rescuing. Booked weekly or fortnightly, it stops dust and grime from settling in and keeps every room in the condition you left it.",
  },
  included: [
    {
      ro: "Aspirarea podelelor și covoarelor pentru a îndepărta praful și murdăria",
      ru: "Чистка полов и ковров для удаления пыли и грязи",
      en: "Vacuuming floors and rugs to lift dust and grit",
    },
    {
      ro: "Spălarea podelelor pentru a elimina urmele de uzură zilnică",
      ru: "Мытье полов для удаления следов повседневного использования",
      en: "Washing the floors to clear everyday marks",
    },
    {
      ro: "Ștergerea prafului de pe mobilă, rafturi, dulapuri și alte suprafețe",
      ru: "Протирание пыли с мебели, полок, шкафов и других поверхностей",
      en: "Dusting furniture, shelves, cupboards and other surfaces",
    },
    {
      ro: "Curățarea oglinzilor și a suprafețelor de sticlă pentru a le menține strălucitoare",
      ru: "Чистка зеркал и стеклянных поверхностей для поддержания их блеска",
      en: "Cleaning mirrors and glass surfaces so they stay clear",
    },
    {
      ro: "Ștergerea prafului de pe electrocasnice pentru a preveni acumularea acestuia",
      ru: "Протирание пыли с бытовой техники для предотвращения ее накопления",
      en: "Dusting appliances before it has a chance to build up",
    },
    {
      ro: "Schimbarea pungilor de gunoi și evacuarea deșeurilor",
      ru: "Замена мусорных пакетов и вынос мусора",
      en: "Changing bin bags and taking the rubbish out",
    },
    {
      ro: "Spălarea și dezinfectarea chiuvetelor, robinetelor și obiectelor sanitare",
      ru: "Мытье и дезинфекция раковин, кранов и сантехнических приборов",
      en: "Washing and disinfecting sinks, taps and sanitary fittings",
    },
    {
      ro: "Ștergerea ușilor și a tocurilor pentru a îndepărta amprentele și murdăria",
      ru: "Протирание дверей и дверных косяков для удаления отпечатков и грязи",
      en: "Wiping doors and door frames to remove fingerprints and grime",
    },
    {
      ro: "Spălarea aragazului și a suprafețelor de gătit pentru a elimina urmele de grăsime",
      ru: "Мытье плиты и кухонных поверхностей для удаления следов жира",
      en: "Washing the hob and cooking surfaces to remove grease",
    },
  ],
};

const afterRenovation: Service = {
  id: "afterRenovation",
  slug: {
    ro: "curatenie-dupa-reparatie",
    ru: "uborka-posle-remonta",
    en: "after-renovation-cleaning",
  },
  image: "serviceAfterRenovation",
  name: {
    ro: "Curățenie după reparație",
    ru: "Уборка после ремонта",
    en: "After-renovation cleaning",
  },
  summary: {
    ro: "Curățenia după renovare elimină praful și mizeria, lăsându-ți casa impecabilă și gata de utilizare imediată.",
    ru: "Уборка после ремонта удаляет пыль и грязь, оставляя ваш дом безупречным и готовым к немедленному использованию.",
    en: "Building work leaves dust in places you would not think to look. We clear it out and hand back a home that is ready to move into.",
  },
  intro: {
    ro: "Fie că te muți într-o casă nouă sau ai renovat apartamentul, lucrările de construcție lasă în urmă murdărie greu de îndepărtat. Suprafețele devin acoperite cu vopsea, adezivi, fragmente de materiale și mult praf. Nu irosi timp și resurse căutând soluții. Echipa noastră este pregătită să rezolve aceste probleme folosind produse și echipamente speciale care protejează finisajele și zugrăvelile.",
    ru: "Будь то переезд в новый дом или ремонт квартиры, строительные работы оставляют за собой трудновыводимые загрязнения. Поверхности покрываются краской, клеем, фрагментами материалов и большим количеством пыли. Не тратьте время и ресурсы на поиск решений. Наша команда готова справиться с этими проблемами, используя специальные средства и оборудование, которые защищают отделку и покраску.",
    en: "Whether you are moving into a new place or have just finished renovating, building work leaves behind dirt that ordinary cleaning will not shift. Surfaces end up covered in paint, adhesive, offcuts and a great deal of fine dust. There is no need to spend your own time working out how to remove it: our team handles it with products and equipment chosen to lift the mess without damaging new finishes or fresh paintwork.",
  },
  included: [
    {
      ro: "Curățarea resturilor de vopsea de pe tocuri, ferestre, uși, calorifere etc.",
      ru: "Очистка остатков краски с рам, окон, дверей, радиаторов и т.д.",
      en: "Removing paint residue from frames, windows, doors, radiators and similar",
    },
    {
      ro: "Curățarea panourilor electrice, gurilor de ventilare și instalațiilor sanitare",
      ru: "Очистка электрических панелей, вентиляционных отверстий и сантехнических установок",
      en: "Cleaning electrical panels, ventilation grilles and plumbing fixtures",
    },
    {
      ro: "Spălarea caloriferelor cu generator de abur",
      ru: "Мытье радиаторов с парогенератором",
      en: "Steam-cleaning the radiators",
    },
    {
      ro: "Ștergerea teracotei din baie, toaletă și bucătărie",
      ru: "Протирка кафеля в ванной, туалете и кухне",
      en: "Wiping down the tiling in the bathroom, toilet and kitchen",
    },
    {
      ro: "Aspirarea și ștergerea mobilierului, dacă este cazul",
      ru: "Пылесоска и протирка мебели, если необходимо",
      en: "Vacuuming and wiping the furniture where needed",
    },
    {
      ro: "Curățarea pervazurilor",
      ru: "Очистка подоконников",
      en: "Cleaning the window sills",
    },
    {
      ro: "Îndepărtarea etichetelor de pe geamuri și rame",
      ru: "Удаление наклеек с окон и рам",
      en: "Removing stickers from glass and frames",
    },
    {
      ro: "Ștergerea pereților",
      ru: "Протирка стен",
      en: "Wiping down the walls",
    },
    {
      ro: "Curățarea plintelor",
      ru: "Очистка плинтусов",
      en: "Cleaning the skirting boards",
    },
    {
      ro: "Curățarea balustradelor",
      ru: "Очистка перил",
      en: "Cleaning the handrails",
    },
    {
      ro: "Curățarea podelelor și pardoselilor",
      ru: "Очистка полов и покрытий",
      en: "Cleaning floors and floor coverings",
    },
    {
      ro: "Curățarea prizelor",
      ru: "Очистка розеток",
      en: "Cleaning the sockets",
    },
    {
      ro: "Curățarea și dezinfectarea suprafețelor din inox, lemn, sticlă etc.",
      ru: "Очистка и дезинфекция поверхностей из нержавеющей стали, дерева, стекла и т.д.",
      en: "Cleaning and disinfecting stainless steel, wood and glass surfaces",
    },
  ],
};

const upholstery: Service = {
  id: "upholstery",
  slug: {
    ro: "curatare-chimica-mobilier-tapitat",
    ru: "himchistka-myagkoy-mebeli",
    en: "upholstery-cleaning",
  },
  image: "serviceUpholstery",
  name: {
    ro: "Curățarea chimică a mobilierului tapițat",
    ru: "Химчистка мягкой мебели",
    en: "Upholstery cleaning",
  },
  summary: {
    ro: "Redă strălucirea mobilierului cu curățarea noastră chimică. Eliminăm petele și murdăria pentru un aspect nou.",
    ru: "Верните блеск вашей мебели с нашей химчисткой. Мы удаляем пятна и грязь, придавая ей новый вид.",
    en: "Sofas, armchairs and dining chairs cleaned by hot-water extraction — stains lifted, fabric left fresh.",
  },
  intro: {
    ro: "Chiar și cele mai bune tapițerii se murdăresc, acumulând praf și pete în timp. Cu ajutorul nostru, piesele tale de mobilier și covoarele pot redeveni ca noi. Materialele de tapițerie variază, iar noi oferim soluții de curățare personalizate și sigure pentru fiecare tip de material.",
    ru: "Даже самые качественные обивки со временем загрязняются, накапливая пыль и пятна. С нашей помощью ваша мебель и ковры снова будут выглядеть как новые. Материалы для обивки разнообразны, и мы предлагаем индивидуальные и безопасные решения для очистки каждого типа материала.",
    en: "Even good upholstery picks up dust and stains over time. Fabrics behave differently, so we match the method and the solution to the material — a wool sofa is not treated like a synthetic one. Furniture and rugs come back looking close to new.",
  },
  included: [
    {
      ro: "Aspirarea profesională a canapelelor, fotoliilor și scaunelor",
      ru: "Профессиональная пылесоска диванов, кресел и стульев",
      en: "Professional vacuuming of sofas, armchairs and chairs",
    },
    {
      ro: "Îndepărtarea petelor cu soluții speciale",
      ru: "Удаление пятен с помощью специальных средств",
      en: "Stain removal with dedicated solutions",
    },
    {
      ro: "Curățarea prin injecție-extracție",
      ru: "Очистка методом инъекции-экстракции",
      en: "Hot-water extraction cleaning",
    },
  ],
};

/** All services, in the order the client lists them. */
export const services = [
  general,
  maintenance,
  afterRenovation,
  upholstery,
] as const satisfies readonly Service[];

export const serviceById: Readonly<Record<ServiceId, Service>> = {
  general,
  maintenance,
  afterRenovation,
  upholstery,
};

/** Every service slug for a locale — feeds `generateStaticParams`. */
export function serviceSlugs(locale: Locale): readonly string[] {
  return services.map((service) => service.slug[locale]);
}

/** Resolve a URL segment back to a service. Returns `undefined` for unknown slugs. */
export function getServiceBySlug(locale: Locale, slug: string): Service | undefined {
  return services.find((service) => service.slug[locale] === slug);
}

/** All localized slugs for one service, keyed by locale — feeds hreflang alternates. */
export function serviceSlugAlternates(id: ServiceId): Localized<string> {
  return serviceById[id].slug;
}
