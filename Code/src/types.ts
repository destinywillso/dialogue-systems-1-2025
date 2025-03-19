import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface DMContext {
  spstRef: AnyActorRef;
<<<<<<< HEAD
  lastResult: Hypothesis[] | null;
  person?: string; 
  day?: string;
  time?: string;
  allDay?: boolean;
  yesNo?: "yes" | "no";
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
=======
  meeting: {
    person: string;
    date: string;
    time: string;
    fullDay: boolean;
  };
  lastResult: string | null;
}

export type DMEvents = 
  | SpeechStateExternalEvent 
  | { type: "CLICK" }
  | { type: "SPEAK_COMPLETE" } 
  | { type: "RECOGNISED"; value: string };
>>>>>>> 953292c (revise)
