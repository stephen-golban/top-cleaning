export { QuoteForm } from "./quote/quote-form";
export type { QuoteFormProps, QuoteFormService } from "./quote/quote-form";

export { submitQuote } from "./quote/action";

export type {
  QuoteDelivery,
  QuoteSubmission,
  DeliveryResolution,
} from "./quote/delivery";
export { resolveQuoteDelivery } from "./quote/delivery";

export type { QuoteState, QuoteValues, QuoteErrors } from "./quote/fields";
export { validateQuote, normalizePhone } from "./quote/fields";
