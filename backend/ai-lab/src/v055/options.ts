import type { IntentLockIntent, IntentLockOption } from "./contracts.js";

type Locale = "pt-BR" | "en-US";

type ContextLabel = {
  capability: Record<Locale, string>;
  request: Record<Locale, string>;
};

const GENERIC: ContextLabel = {
  capability: { "pt-BR": "Saber se Alex consegue", "en-US": "Find out if Alex can do it" },
  request: { "pt-BR": "Pedir para Alex fazer", "en-US": "Ask Alex to do it" },
};

const CONTEXTS: Array<{ pattern: RegExp; label: ContextLabel }> = [
  {
    pattern: /\b(?:terminar|finalizar|fechar|finish|finalize|complete|wrap up)\b.*\b(?:hoje|today|tonight)\b/iu,
    label: {
      capability: { "pt-BR": "Saber se Alex consegue terminar hoje", "en-US": "Find out if Alex can finish today" },
      request: { "pt-BR": "Pedir para Alex terminar hoje", "en-US": "Ask Alex to finish today" },
    },
  },
  {
    pattern: /\b(?:slides?|apresentação|presentation)\b/iu,
    label: {
      capability: { "pt-BR": "Saber se Alex consegue terminar os slides", "en-US": "Find out if Alex can finish the slides" },
      request: { "pt-BR": "Pedir para Alex terminar os slides", "en-US": "Ask Alex to finish the slides" },
    },
  },
  {
    pattern: /\b(?:fontes?|sources?)\b/iu,
    label: {
      capability: { "pt-BR": "Saber se Alex consegue enviar as fontes", "en-US": "Find out if Alex can send the sources" },
      request: { "pt-BR": "Pedir para Alex enviar as fontes", "en-US": "Ask Alex to send the sources" },
    },
  },
];

function labelsFor(text: string): ContextLabel {
  return CONTEXTS.find((context) => context.pattern.test(text))?.label ?? GENERIC;
}

export class IntentLockOptionBuilder {
  build(input: { locale: Locale; userText: string; routerPrimaryIntent: IntentLockIntent }): IntentLockOption[] {
    const labels = labelsFor(input.userText);
    return [
      {
        id: "CAPABILITY",
        intent: "ASK_CAPABILITY",
        label: labels.capability[input.locale],
        routerSuggested: input.routerPrimaryIntent === "ASK_CAPABILITY",
      },
      {
        id: "REQUEST",
        intent: "REQUEST_COMPLETION",
        label: labels.request[input.locale],
        routerSuggested: input.routerPrimaryIntent === "REQUEST_COMPLETION",
      },
    ];
  }
}
