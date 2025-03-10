import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

<<<<<<< HEAD
export interface NLUValue {
  topIntent: string; 
  entities: Record<string, any>; 
}

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  nluValue: NLUValue | null; 
=======
export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  person?: string; 
>>>>>>> 59cecbb90cd1cb7c68def12d975a13243584e990
  day?: string;
  time?: string;
  allDay?: boolean;
  yesNo?: "yes" | "no";
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
