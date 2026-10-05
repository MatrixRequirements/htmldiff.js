/** What a column or table holds, order ignored, duplicates counted. */
export declare type ValueCounts = Record<string, number>;
/**
 * Counts values, empty ones left out.
 * @param values The values.
 * @returns The counts.
 */
export declare function countValues(values: string[]): ValueCounts;
/**
 * How many distinct values there are.
 * @param counts The counts.
 * @returns The number of distinct values.
 */
export declare function countsSize(counts: ValueCounts): number;
/**
 * The share of the old values still present in the new.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1.
 */
export declare function retainedShare(oldCounts: ValueCounts, newCounts: ValueCounts): number;
/**
 * The share of all values the two sides have in common.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
export declare function valueOverlap(oldCounts: ValueCounts, newCounts: ValueCounts): number;
/**
 * The share of the smaller side's values the two sides have in common: rows come and go all
 * the time, so a column or table is judged on what both versions could hold, not on the rows
 * one of them added.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
export declare function sharedShare(oldCounts: ValueCounts, newCounts: ValueCounts): number;
/**
 * The share of the smaller side's cells a shared value accounts for, every shared value counted
 * once however often it repeats: a few filler values repeated over many cells say little about
 * two tables being the same table.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
export declare function distinctSharedShare(oldCounts: ValueCounts, newCounts: ValueCounts): number;
/**
 * How much of what a cell said is still there: the share of words the two cells have in
 * common. An edited cell keeps most of its words, a cell that was replaced keeps none.
 * @param oldSignature The old cell's signature.
 * @param newSignature The new cell's signature.
 * @returns 0..1.
 */
export declare function cellSimilarity(oldSignature: string, newSignature: string): number;
