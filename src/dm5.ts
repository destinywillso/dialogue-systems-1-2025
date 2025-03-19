import { assign, createActor, setup, AnyActorRef } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { NLU_KEY } from "./azure";
import { DMContext, DMEvents } from "./types";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const azureLanguageCredentials = {
  endpoint: "https://languageresource25310.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2024-11-15-preview",
  key: NLU_KEY,
  deploymentName: "lab4NLU",
  projectName: "lab4",
};

const settings: Settings = {
  azureRegion: "northeurope", 
  azureLanguageCredentials: azureLanguageCredentials,
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};

interface GrammarEntry {
  person?: string;
  day?: string;
  time?: string;
}

const grammar: { [index: string]: GrammarEntry } = {
  vlad: { person: "Vladislav Maraev" },
  aya: { person: "Nayat Astaiza Soriano" },
  victoria: { person: "Victoria Daniilidou" },
  g : { person: "Gong tianyi"},
  monday: { day: "Monday" },
  tuesday: { day: "Tuesday" },
  today: { day: "today" },
  tomorrow: { day: "tomorrow" },
  "10": { time: "10:00" },
  "11": { time: "11:00" },
  "10 am": { time: "10:00" },
  "10 o’clock": { time: "10:00" },
  "11 am": { time: "11:00" },
  "2 pm": { time: "14:00" },
  "14": { time: "14:00" },
  "16:30": { time: "16:30" },
};

const yesorNo: { [index: string]: "yes" | "no" } = {
  yes: "yes",
  "of course": "yes",
  sure: "yes",
  absolutely: "yes",

  no: "no",
  "no way": "no",
  nope: "no",
  nah: "no",
};

function YesNo(utterance: string): "yes" | "no" | null {
  const normalized = utterance.toLowerCase().trim();
  const result = yesorNo[normalized];
  return result ?? null;
}

function isInGrammar(utterance: string) {
  return utterance.toLowerCase() in grammar;
}

function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}

function getConfidence(hypothesis: any) {
  return hypothesis?.confidence ?? 0;
}

const dmMachine = setup({
  types: {
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: {
          utterance: params.utterance,
        },
      }),
    "spst.listen": ({ context }) =>
      context.spstRef.send({
        type: "LISTEN",
        value: { nlu: true },
      }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }) as AnyActorRef,
    lastResult: null,
    nluValue: null,
    retryCount: 0,
    previousState: null,
    confidenceThreshold: 0.6, 
    nluConfidenceThreshold: 0.6, 
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: { CLICK: "Greeting" },
    },
    Greeting: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          {
            target: "CheckGrammar",
            guard: ({ context }) => !!context.lastResult,
          },
          { target: ".NoInput" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", params: { utterance: `Hello world!` } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: {
            type: "spst.speak",
            params: { utterance: `I can't hear you!` },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event, context }) => {
                const confidence = getConfidence(event.value);
                if (confidence < context.confidenceThreshold) {
                  return {
                    lastResult: null,
                    nluValue: null,
                    retryCount: context.retryCount + 1,
                  };
                } else {
                  return {
                    lastResult: event.value,
                    nluValue: event.nluValue,
                    retryCount: 0,
                  };
                }
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ lastResult: null }),
            },
            HELP: {
              actions: assign(({ context }) => {
                return { previousState: context.state };
              }),
            },
          },
        },
      },
    },
    CheckGrammar: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => {
          const utterance = context.lastResult?.[0]?.utterance || "";
          const nluValue = context.nluValue;

          if (!utterance) {
            return { utterance: "I didn't hear anything. Can you speak again?" };
          }

          if (nluValue?.topIntent === "create a meeting") {
            return { utterance: `You want to create a meeting.` };
          } else if (nluValue?.topIntent === "who is X") {
            const person = getPerson(utterance);
            if (person) {
              return { utterance: `You are asking about ${person}.` };
            } else {
              return { utterance: `I don't know who you are asking about.` };
            }
          }

          const yesNo = YesNo(utterance);
          if (yesNo === "yes") {
            return { utterance: `You said yes!` };
          } else if (yesNo === "no") {
            return { utterance: `You said no!` };
          }

          const person = getPerson(utterance);
          if (person) {
            return { utterance: `You mentioned ${person}.` };
          }

          if (!isInGrammar(utterance)) {
            return { utterance: `I don't understand the phrase: "${utterance}". Can you speak again?` };
          }

          return {
            utterance: `You just said: ${utterance}. And it ${
              isInGrammar(utterance) ? "is" : "is not"
            } in the grammar.`,
          };
        },
      },
      on: {
        SPEAK_COMPLETE: [
          {
            target: "Greeting.Ask",
            guard: ({ context }) =>
              !context.lastResult || !isInGrammar(context.lastResult[0]?.utterance),
          },
          { target: "Success" },
          { target: "Done" },
        ],
      },
    },
    Done: {
      on: {
        CLICK: "Greeting",
      },
    },
    Success: {
      entry: {
        type: "spst.speak",
        params: { utterance: "Good" },
      },
      on: { SPEAK_COMPLETE: "Done" },
    },
  },
});

const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  console.group("State update");
  console.log("State value:", state.value);
  console.log("State context:", state.context);
  console.groupEnd();
});

export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.subscribe((snapshot) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });
}
