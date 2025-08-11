export interface AnalysisResult {
  hypothesis_id: string;
  confidence_score: number;
  reasoning: string;
  relevant_quotes: string[];
  status_recommendation: "VALIDATED" | "NOT_VALIDATED" | "HUMAN_JUDGMENT";
}

export interface NotificationData {
  hypothesis_id: string;
  confidence_score: number;
  summary: string;
}


