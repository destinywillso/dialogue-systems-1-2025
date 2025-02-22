import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  person?: string; 
  day?: string;
  time?: string;
  allDay?: boolean;
  yesNo?: "yes" | "no";
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
