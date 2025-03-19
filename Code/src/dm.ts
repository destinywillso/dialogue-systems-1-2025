import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvents } from "./types";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint: "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
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


const dmMachine = setup({
  types: {
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
    speak: ({ context }: { context: DMContext }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: { utterance: params.utterance },
      }),
    listen: ({ context }: { context: DMContext }) => context.spstRef.send({ type: "LISTEN" }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
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
    },
  },
});

const dmActor = createActor(dmMachine, { inspect: inspector.inspect }).start();

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
}

