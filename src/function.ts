interface GrammarEntry {
    person?: string;
    day?: string;
    time?: string;
  }
  
const grammar: { [index: string]: GrammarEntry } = {
    vlad: { person: "Vladislav Maraev" },
    aya: { person: "Nayat Astaiza Soriano" },
    victoria: { person: "Victoria Daniilidou" },
    g: { person: "Gong tianyi" },
    monday: { day: "Monday" },
    tuesday: { day: "Tuesday" },
    today: { day: "today" },
    tomorrow: { day: "tomorrow" },
    "10": { time: "10:00" },
    "11": { time: "11:00" },
    "10 am": { time: "10:00" },
    "10 o’clock": { time: "10:00" },
    "11 am": { time: "11:00" },
    "2 pm": { time: "14:00" },
    "14": { time: "14:00" },
    "16:30": { time: "16:30" },
  };

export function speak(utterance: string) {
    return { type: "spst.speak", params: { utterance } };
  }
  
  export function listen(nlu: boolean = true) {
    return { type: "spst.listen", value: { nlu } };
  }
  
  export function generateResponseBasedOnUtterance(utterance: string, nluValue: any) {
    if (!utterance) {
      return "I didn't hear anything. Can you speak again?";
    }
    if (nluValue?.topIntent === "create a meeting") {
      return `You want to create a meeting.`;
    } else if (nluValue?.topIntent === "who is X") {
      const person = getPerson(utterance);
      return person ? `You are asking about ${person}.` : `I don't know who you are asking about.`;
    }
    const yesNo = YesNo(utterance);
    if (yesNo === "yes") {
      return `You said yes!`;
    } else if (yesNo === "no") {
      return `You said no!`;
    }
  
    const person = getPerson(utterance);
    if (person) {
      return `You mentioned ${person}.`;
    }
  
    if (!isInGrammar(utterance)) {
      return `I don't understand the phrase: "${utterance}". Can you speak again?`;
    }
  
    return `You just said: ${utterance}. And it ${isInGrammar(utterance) ? "is" : "is not"} in the grammar.`;
  }
  
  export function getConfidence(hypothesis: any) {
    return hypothesis?.confidence ?? 0;
  }
  
  export function YesNo(utterance: string): "yes" | "no" | null {
    const yesorNo: { [index: string]: "yes" | "no" } = {
      yes: "yes",
      "of course": "yes",
      sure: "yes",
      absolutely: "yes",
      no: "no",
      "no way": "no",
      nope: "no",
      nah: "no",
    };
    const normalized = utterance.toLowerCase().trim();
    return yesorNo[normalized] ?? null;
  }
  
  export function isInGrammar(utterance: string) {
    return utterance.toLowerCase() in grammar;
  }
  
  export function getPerson(utterance: string) {
    return (grammar[utterance.toLowerCase()] || {}).person;
  }
  