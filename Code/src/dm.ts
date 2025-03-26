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

interface GrammarEntry {
  person?: string;
  day?: string;
  time?: string;
  confirm?: string;
}

const grammar: { [index: string]: GrammarEntry } = {
  vlad: { person: "Vladislav Maraev" },
  aya: { person: "Nayat Astaiza Soriano" },
  victoria: { person: "Victoria Daniilidou" },
  ty: {person: "Gong TianYi"}, 
  monday: { day: "Monday" },
  tuesday: { day: "Tuesday" },
  wednesday: { day: "Wednesday" },
  thursday: { day: "Thursday" },
  friday: { day: "Friday" },
  saturday: { day: "Saturday" },
  sunday: { day: "Sunday" },
  today: {day: "Today"},
  tomorrow: {day: "Tomorrow"},
  "9": { time: "09:00" },
  "10": { time: "10:00" },
  "11": { time: "11:00" },
  "12": { time: "12:00" },
  "13": { time: "13:00" },
  "14": { time: "14:00" },
  "15": { time: "15:00" },
  "16": { time: "16:00" },
  "17": { time: "17:00" },
  "18": { time: "18:00" },
  yes: { confirm: "yes"},
  ok: { confirm: "yes"},
  sure: { confirm: "yes"},
  no: { confirm: "no"},
};

function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}

function getDay(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).day;
}

function getDecision(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).confirm
}
function getTime(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).time;
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
      }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    lastResult: null,
    person: null,
    day: null,
    time: null, 
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
      entry: { type: "spst.speak", params: { utterance: `Let's create an appointment.` } },
      on: { SPEAK_COMPLETE: "Start" },
    },

    Start: {
      initial : "Person",
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            return { lastResult: event.value };
          }),
        },
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
        CLICK: "Done"
      },

      states: {
        Person : {
          initial : "Prompt",
          states:{
            Prompt : {
              entry: { type: "spst.speak", params: { utterance: `Who are you meeting with?` } },
              on: { SPEAK_COMPLETE: "Next" },
            },
            Next : {
              entry: { type: "spst.listen" },
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Start.Day",
                    guard: ({ context }) => !!context.lastResult && !!getPerson(context.lastResult![0].utterance),
                    actions: assign(({ context }) => {
                      return { person: getPerson(context.lastResult![0].utterance)}
                    })
                  },
                  {
                    target: "TryAgain",
                  }
                ],
              },
            },
            TryAgain : {
              entry: {type: "spst.speak",
                params: ({context}) => ({
                  utterance: !!context.lastResult && "I can't hear you" || "I did not hear you.",
                  })
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
          }
        },

        Day: {
          initial: "Prompt",
          states : {
            Prompt : {
              entry: { type: "spst.speak", params: { utterance: `On which day is your meeting?` } },
              on: { SPEAK_COMPLETE: "Next" },
            },
            Next : {
              entry: { type: "spst.listen" },
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Start.IFWholeDay",
                    guard: ({ context }) => !!context.lastResult && !!getDay(context.lastResult![0].utterance),
                    actions: assign(({ context }) => {
                      return { day: getDay(context.lastResult![0].utterance)};
                    }),
                  },
                  {
                    target: "TryAgain",
                  }
                ],
              },
            },
            TryAgain : {
              entry: {type: "spst.speak",
                params: ({context}) => ({
                  utterance: (!!context.lastResult && "That is not a day I know. Please specify a day of the week.") || "I did not hear you.",
                })
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
          }
        },

        IFWholeDay : {
          initial: "Prompt",
          states: {
            Prompt : {
              entry: {type: "spst.speak", params: { utterance: `Will it take the whole day?`}},
              on: { SPEAK_COMPLETE: "Next"}
            },
    
            Next: {
              entry: {type: "spst.listen" },
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Start.Confirm",
                    guard: ({ context }) => !!context.lastResult && getDecision(context.lastResult![0].utterance) == `yes`,
                  },
                  {
                    target: "#DM.Start.Time",
                    guard: ({ context }) => !!context.lastResult && getDecision(context.lastResult![0].utterance) == `no`,
                  },
                  {
                    target: "TryAgain",
                  }
                ],
              },
            },
            TryAgain : {
              entry: {type: "spst.speak",
                params: ({context}) => ({
                  utterance: (!!context.lastResult &&  "I did not understand what you said.") || "I did not hear you." ,
                })
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
          }
        },

        Time : {
          initial: "Prompt",
          states: {
            Prompt : {
              entry: {type: "spst.speak", params: {utterance: `What time is your meeting`}},
              on: {SPEAK_COMPLETE: "Next"},
            },
    
            Next : {
              entry: {type: "spst.listen"},
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Start.Confirm",
                    guard: ({ context }) => !!context.lastResult && !!getTime(context.lastResult![0].utterance),
                    actions: assign(({ context }) => {
                      return { time: getTime(context.lastResult![0].utterance)};
                    }),
                  },
                  {
                    target: "TryAgain",
                  }
                ],
              },
            },
            TryAgain : {
              entry: {type: "spst.speak",
                params: ({context}) => ({
                  utterance: (!!context.lastResult && "I don't recognize that time.") || "I did not hear you.",
                })
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
          }
        },

        Confirm : {
          initial: "Prompt",
          states: {
            Prompt : {
              entry: {
                type: "spst.speak", 
                params: ({ context }) => ({
                  utterance: `Do you want me to create an appointment with ${context.person} on ${context.day} ${!!context.time ? "at " + context.time : "for the whole day"}?`,
                }),
              },
              on : {SPEAK_COMPLETE: "Next"},
            },
            Next: {
              entry: {type: "spst.listen"},
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Done",
                    guard: ({ context }) => !!context.lastResult && getDecision(context.lastResult![0].utterance) == `yes`,
                  },
                  {
                    target: "Back",
                    guard: ({ context }) => !!context.lastResult && getDecision(context.lastResult![0].utterance) == `no`,
                  },
                  {
                    target: "Again",
                  }
                ],
              },
            },
            Again : {
              entry: {type: "spst.speak",
                params: ({context}) => ({
                  utterance: (!!context.lastResult && "I did not understand what you just said." ) || "I cannot hear you.",
                })
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
            Back: {
              entry: {type: "spst.speak", params: {utterance: `OK,We will start again.`}},
              on: {SPEAK_COMPLETE: {
                target: "#DM.Start.Person",
                actions: assign({ time: null, person: null, day: null}),
                }
              }
            },
          }
        },
      },
    },
    Done : {
      entry: {type: "spst.speak", params: {utterance: `Your appointment has been created!`}},
      on : {
        CLICK: {
            target: "Greeting",
            actions: assign({ time: null, person: null, day: null}),
          }
      }
    }
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

