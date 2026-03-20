// ---------------------------------------------------------------------------
// analysis.ts -- Prompt data types for AI-powered analysis
// ---------------------------------------------------------------------------

import type { BriefType } from './common.js';

/** Data passed to the LLM when generating a competitor battlecard. */
export interface BattlecardPromptData {
  /** The system prompt that sets the LLM's role / constraints. */
  systemPrompt: string;
  /** The user prompt containing signal data and instructions. */
  userPrompt: string;
  /** Name of the competitor the battlecard is for. */
  competitorName: string;
  /** Number of signals included in the prompt context. */
  signalCount: number;
}

/** Data passed to the LLM when generating a periodic brief. */
export interface BriefPromptData {
  /** The system prompt that sets the LLM's role / constraints. */
  systemPrompt: string;
  /** The user prompt containing aggregated signal data. */
  userPrompt: string;
  /** Whether this is a weekly or monthly brief. */
  briefType: BriefType;
  /** Number of competitors covered in the brief. */
  competitorCount: number;
  /** Total number of signals included in the brief. */
  signalCount: number;
}
