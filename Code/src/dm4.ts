import { assign, createActor, setup } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY , NLU_KEY } from "./azure";
import { DMContext, DMEvents } from "./types";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint: "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
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

function getEntity(
  targetCategory: string,
  entities: { category: string; text: string }[]
): string | null {
  return entities.find((e) => 
    e.category.toLowerCase() === targetCategory.toLowerCase()
  )?.text ?? null;
}

const Personlist: {[index: string]: string} = {
  "Charles Darwin": "an English naturalist, geologist, and biologist best known for developing the theory of evolution by natural selection.",
  "Winston Churchill": "a British statesman, army officer, and writer who served as Prime Minister of the United Kingdom during World War II.",
  "Marie Curie": "a Polish-born physicist and chemist known for her pioneering research on radioactivity and the first woman to win a Nobel Prize.",
  "Thomas Edison": "an American inventor and businessman best known for inventing the phonograph, the motion picture camera, and the electric light bulb.",
  "Steve Jobs": "an American entrepreneur and inventor who co-founded Apple Inc. and revolutionized the personal computer, music, and mobile phone industries.",
  "Albert Einstein": "a German-born theoretical physicist best known for developing the theory of relativity and the famous equation E=mc².",
  "Isaac Newton": "an English mathematician, physicist, and astronomer who formulated the laws of motion and universal gravitation.",
  "Ludwig van Beethoven": "a German composer and pianist whose works are among the most important in Western classical music, bridging the Classical and Romantic eras.",
  "Nikola Tesla": "a Serbian-American inventor, engineer, and futurist best known for his contributions to the development of alternating current (AC) electricity.",
  "William Shakespeare": "an English playwright, poet, and actor widely regarded as the greatest writer in the English language and the world's greatest dramatist."
};

function getPerson(person: string | null): string {
  if (!person) return "This person can't be recognized.";
  const lowerPerson = person.toLowerCase();
  const matchedKey = Object.keys(Personlist).find(
    (key) => key.toLowerCase() === lowerPerson
  );
  return matchedKey ? Personlist[matchedKey] : `I don't know about ${person}.`;
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
        value: { nlu: true }
      }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    lastResult: null,
    person: null,
    day: null,
    time: null,
    NluResult: null,
  }),
  id: "DM",
  initial: "Prepare",
  on: {
    RECOGNISED: {
      actions: assign(({ event }) => {
        return { lastResult: event.value, NluResult: event.nluValue };
      }),
    },
    ASR_NOINPUT: {
      actions: assign({ lastResult: null }),
    },
  },

  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },

    WaitToStart: {
      on: { CLICK: "Welcome" },
    },

    Welcome : {
      initial: "Greeting",

      states: {
        Greeting: {
          entry: {type: "spst.speak", params: {utterance: `Hello!How can i help you today?`}},
          on: { SPEAK_COMPLETE: "Next"}
        },
        Next: {
          entry: { type: "spst.listen" },
            on: {
        
              LISTEN_COMPLETE: [
                {target: "#DM.Personcheck", 
                  guard: ({context}) => !!context.lastResult && context.NluResult?.topIntent == "whoisx",
                  actions: assign(({ context }) => {
                    return { person: getEntity("person_name", context.NluResult!.entities)}
                  })
                },

                {target: "#DM.Start", 
                  guard: ({context}) => !!context.NluResult && context.NluResult.topIntent == "createameeting",
                },

                {target: "TryAgain"}
              ]
            }
        },
        TryAgain : {
          entry: {type: "spst.speak",
            params: ({context}) => ({
              utterance: !!context.lastResult && "I don't understand" || "I did not hear you.",
              })
          },
          on: {SPEAK_COMPLETE: "Greeting"},
        }
      }
    },

    Personcheck: {
      entry: [
        ({ context }) => {const person_introduction = getPerson(context.person);
          context.spstRef.send({
            type: "SPEAK",
            value: { utterance: person_introduction },
          });
        },
      ],
      on: {SPEAK_COMPLETE: "Welcome"}
    },

    Start: {
      initial: "Person",
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
                    guard: ({ context }) => 
                      !!context.lastResult && 
                      !!context.NluResult && 
                      !!getEntity("person_name", context.NluResult!.entities),
                    actions: assign(({ context }) => {
                      return { person: getEntity("person_name", context.NluResult!.entities)}
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
              utterance: !!context.lastResult && "Sorry,I don't know this person" || "I did not hear you.",
              })
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
          }
        },

        Day : {
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
                    guard: ({ context }) => 
                      !!context.lastResult && 
                      !!context.NluResult && 
                      !!getEntity("meeting_time", context.NluResult!.entities),
                    actions: assign(({ context }) => {
                      return { day: getEntity("meeting_time", context.NluResult!.entities)}
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
                  utterance: !!context.lastResult && "Sorry,I don't understand the day you say" || "I did not hear you.",
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

            Next : {
              entry: {type: "spst.listen" },
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Start.Confirm",
                    guard: ({ context }) => !!context.NluResult?.entities && !!getEntity("yes", context.NluResult!.entities) 
                  },
                  {
                    target: "#DM.Start.Time",
                    guard: ({ context }) => !!context.NluResult?.entities && !!getEntity("no", context.NluResult!.entities)
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
                  utterance: !!context.lastResult && "Sorry,I don't understand" || "I did not hear you.",
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
                    guard: ({ context }) => 
                      !!context.lastResult && 
                      !!context.NluResult && 
                      !!getEntity("meeting_time", context.NluResult!.entities),
                    actions: assign(({ context }) => {
                      return { time: getEntity("meeting_time", context.NluResult!.entities)}
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
                params: ({context}) => ({utterance: `${
                  !!context.lastResult ? "I don't recognize that time." : "I did not hear you."}`})
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
            Next : {
              entry: {type: "spst.listen"},
              on: {
                LISTEN_COMPLETE: [
                  {
                    target: "#DM.Start.Done",
                    guard: ({ context }) => !!context.NluResult?.entities && !!getEntity("yes", context.NluResult?.entities) 
                  },
                  {
                    target: "Back",
                    guard: ({ context }) => !!context.NluResult?.entities && !!getEntity("no", context.NluResult?.entities) 
                  },
                  {
                    target: "TryAgain",
                  }
                ],
              },
            },
            TryAgain : {
              entry: {type: "spst.speak",
                params: ({context}) => ({utterance: `${
                  !!context.lastResult ? "I don't understand what you said." : "I cannot hear you."}`})
              },
              on: {SPEAK_COMPLETE: "Prompt"},
            },
            Back: {
              entry: {type: "spst.speak", params: {utterance: `Alright.`}},
              on: {SPEAK_COMPLETE: {
                target: "#DM.Start.Person",
                actions: assign({ time: null, person: null, day: null}),
                }
              }
            },
          }
        },

        Done : {
          entry: {type: "spst.speak", params: {utterance: `Your appointment has been created!`}},
          on : {
            CLICK: {
                target: "#DM.Welcome",
                actions: assign({ time: null, person: null, day: null}),
              }
          }
        }
      },
    },

    StartAgain: {
      on: {CLICK: {
        target : "Welcome",
        actions: assign({ time : null, person : null, day : null})
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

