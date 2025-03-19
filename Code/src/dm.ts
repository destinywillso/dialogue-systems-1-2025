import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvents } from "./types";

const inspector = createBrowserInspector();

const azureCredentials = {
<<<<<<< HEAD
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
=======
  endpoint: "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
>>>>>>> 953292c (revise)
  key: KEY,
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};

<<<<<<< HEAD
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
=======
>>>>>>> 953292c (revise)

const dmMachine = setup({
  types: {
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
<<<<<<< HEAD
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
      }),
=======
    speak: ({ context }: { context: DMContext }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: { utterance: params.utterance },
      }),
    listen: ({ context }: { context: DMContext }) => context.spstRef.send({ type: "LISTEN" }),
>>>>>>> 953292c (revise)
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
<<<<<<< HEAD
    lastResult: null,
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
              actions: assign(({ event }) => {
                return { lastResult: event.value };
              }),
            },
            ASR_NOINPUT: {
              actions: assign({ lastResult: null }),
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

          if (!utterance) {
            return { utterance: "I didn't hear anything. Can you speak again?" };
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
              !context.lastResult ||
              !isInGrammar(context.lastResult[0]?.utterance), 
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
=======
    meeting: { person: "", date: "", time: "", fullDay: false },
    lastResult: null,
  }),
  id: "DM",
  initial: "Greeting",
  states: {
    Greeting: {
      entry: { type: "speak", params: { utterance: "Let's create an appointment." } },
      on: { SPEAK_COMPLETE: "AskPerson" },
    },
    AskPerson: {
      entry: { type: "speak", params: { utterance: "Who are you meeting with?" } },
      on: { SPEAK_COMPLETE: "ListenPerson" },
    },
    ListenPerson: {
      entry: { type: "listen" },
      on: {
        RECOGNISED: {
          actions: assign(({ event, context }: { event: any; context: DMContext }) => {
            return { meeting: { ...context.meeting, person: event.value } };
          }),
          target: "AskDate",
        },
      },
    },
    AskDate: {
      entry: { type: "speak", params: { utterance: "On which day is your meeting?" } },
      on: { SPEAK_COMPLETE: "ListenDate" },
    },
    ListenDate: {
      entry: { type: "listen" },
      on: {
        RECOGNISED: {
          actions: assign(({ event, context }: { event: any; context: DMContext }) => {
            return { meeting: { ...context.meeting, date: event.value } };
          }),
          target: "AskFullDay",
        },
      },
    },
    AskFullDay: {
      entry: { type: "speak", params: { utterance: "Will it take the whole day?" } },
      on: { SPEAK_COMPLETE: "ListenFullDay" },
    },
    ListenFullDay: {
      entry: { type: "listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }: { event: any }) => event.value.toLowerCase() === "yes",
            actions: assign(({ context }: { context: DMContext }) => ({
              meeting: { ...context.meeting, fullDay: true },
            })),
            target: "ConfirmAppointment",
          },
          {
            guard: ({ event }: { event: any }) => event.value.toLowerCase() === "no",
            target: "AskTime",
          },
        ],
      },
    },
    AskTime: {
      entry: { type: "speak", params: { utterance: "What time is your meeting?" } },
      on: { SPEAK_COMPLETE: "ListenTime" },
    },
    ListenTime: {
      entry: { type: "listen" },
      on: {
        RECOGNISED: {
          actions: assign(({ event, context }: { event: any; context: DMContext }) => {
            return { meeting: { ...context.meeting, time: event.value } };
          }),
          target: "ConfirmAppointment",
        },
      },
    },
    ConfirmAppointment: {
      entry: ({ context }: { context: DMContext }) => {
        const { person, date, time, fullDay } = context.meeting;
        const utterance = fullDay
          ? `Do you want me to create an appointment with ${person} on ${date} for the whole day?`
          : `Do you want me to create an appointment with ${person} on ${date} at ${time}?`;
        context.spstRef.send({ type: "SPEAK", value: { utterance } });
      },
      on: { SPEAK_COMPLETE: "ListenConfirmation" },
    },
    ListenConfirmation: {
      entry: { type: "listen" },
      on: {
        RECOGNISED: [
          {
            guard: ({ event }: { event: any }) => event.value.toLowerCase() === "yes",
            target: "AppointmentCreated",
          },
          {
            guard: ({ event }: { event: any }) => event.value.toLowerCase() === "no",
            target: "Greeting",
          },
        ],
      },
    },
    AppointmentCreated: {
      entry: { type: "speak", params: { utterance: "Your appointment has been created!" } },
      on: { SPEAK_COMPLETE: "Greeting" },
>>>>>>> 953292c (revise)
    },
  },
});

<<<<<<< HEAD


const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();
=======
const dmActor = createActor(dmMachine, { inspect: inspector.inspect }).start();
>>>>>>> 953292c (revise)

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
<<<<<<< HEAD
  dmActor.subscribe((snapshot) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta(),
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });
}
=======
}

>>>>>>> 953292c (revise)
