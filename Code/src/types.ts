import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface NLUValue {
  topIntent: string; 
  entities: Record<string, any>; 
}

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  nluValue: NLUValue | null; 
  day?: string;
  time?: string;
  allDay?: boolean;
  yesNo?: "yes" | "no";
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
