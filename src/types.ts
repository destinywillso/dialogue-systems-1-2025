import { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export interface NLUValue {
  topIntent: string; 
  entities: Record<string, any>; 
}

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: Hypothesis[] | null;
  person?: string; 
  day?: string;
  time?: string;
  allDay?: boolean;
  yesNo?: "yes" | "no";
  nluValue: any;    
  retryCount: number;
  confidenceThreshold: number; 
  nluConfidenceThreshold: number;
  }
  

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
