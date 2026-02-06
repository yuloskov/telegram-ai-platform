/**
 * Types and constants for relevance scoring.
 * The actual AI scoring implementation lives in the worker (which has @repo/ai dependency).
 */

export interface PageInfo {
  url: string;
  title?: string;
}

export interface ChannelContext {
  niche?: string;
  description?: string;
  language?: string;
}

export interface ScoredPage {
  url: string;
  score: number;
}

export const RELEVANCE_THRESHOLD = 0.3;
