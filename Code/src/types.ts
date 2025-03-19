import { SpeechStateExternalEvent } from "speechstate";
import { AnyActorRef } from "xstate";

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" };
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
}
