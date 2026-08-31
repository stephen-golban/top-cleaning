import type { LocalizedText } from "./types";

/**
 * How working with Top Cleaning goes, start to finish.
 *
 * RO and RU are the client's own copy, verbatim from the previous site
 * (`.agents/source-inventory.md` §4, `Index.steps`). EN is net-new.
 *
 * The old site rendered these by looping over the *services* collection, so a
 * fifth service would have blanked the section. Here the steps are their own
 * fixed-length tuple.
 */
export const stepIds = ["request", "quote", "cleaning", "payment"] as const;

export type StepId = (typeof stepIds)[number];

export interface Step {
  readonly id: StepId;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
}

export const steps: readonly [Step, Step, Step, Step] = [
  {
    id: "request",
    title: {
      ro: "Cererea",
      ru: "Заявка",
      en: "The request",
    },
    description: {
      ro: "Contactează-ne pentru a ne comunica nevoile tale de curățenie. Echipa noastră va răspunde rapid pentru a stabili detaliile inițiale.",
      ru: "Свяжитесь с нами, чтобы сообщить о ваших потребностях в уборке. Наша команда быстро ответит для уточнения начальных деталей.",
      en: "Get in touch and tell us what needs cleaning. We come back to you quickly to settle the first details.",
    },
  },
  {
    id: "quote",
    title: {
      ro: "Calcularea",
      ru: "Расчет",
      en: "The quote",
    },
    description: {
      ro: "Vom evalua cerințele specifice și vom oferi un calcul exact al costurilor, asigurând transparență și corectitudine.",
      ru: "Мы оценим ваши конкретные требования и предложим точный расчет стоимости, обеспечивая прозрачность и справедливость.",
      en: "We look at what the job actually involves and give you an exact price, with nothing left to discover later.",
    },
  },
  {
    id: "cleaning",
    title: {
      ro: "Curățenia",
      ru: "Уборка",
      en: "The clean",
    },
    description: {
      ro: "Echipa noastră de profesioniști va efectua serviciile de curățenie conform programului stabilit, folosind echipamente și produse de calitate.",
      ru: "Наша команда профессионалов выполнит уборочные услуги в соответствии с установленным графиком, используя качественное оборудование и средства.",
      en: "Our team does the work at the time you agreed, bringing its own equipment and cleaning products.",
    },
  },
  {
    id: "payment",
    title: {
      ro: "Plata",
      ru: "Оплата",
      en: "Payment",
    },
    description: {
      ro: "După finalizarea curățeniei, poți efectua plata prin metoda convenabilă pentru tine. Satisfacția ta este prioritatea noastră.",
      ru: "После завершения уборки вы можете произвести оплату удобным для вас способом. Ваше удовлетворение — наш приоритет.",
      en: "Once the work is done, you pay by whichever method suits you. You only settle up after you have seen the result.",
    },
  },
];
