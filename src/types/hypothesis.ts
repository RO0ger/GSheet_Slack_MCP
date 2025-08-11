export interface Hypothesis {
  ID: string;
  Category: string;
  "Problem Title": string;
  Hypothesis: string;
  "Questions to Ask in Meeting": string;
  Pain: string;
  Status: "VALIDATED" | "NOT_VALIDATED" | "NEEDS_MORE_DATA";
  Deployments: string;
  Confidence: string;
  "Confidence %": number;
  "Quote 1": string;
  "Quote 2": string;
  "Possible Fix": string;
  "Scale Risk": string;
}

export interface HypothesisUpdate {
  confidence?: string;
  confidencePercent?: number;
  quote1?: string;
  quote2?: string;
  status?: "VALIDATED" | "NOT_VALIDATED" | "NEEDS_MORE_DATA";
}


