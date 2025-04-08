import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface nluResult {
  topIntent: string;         
  entities: NluEntity[];  
}

export interface NluEntity {
  category: string;         
  text: string;            
  value?: any;            
}
export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  person: string | null;
  day: string | null;
  time: string | null;
  NluResult: nluResult | null;
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };