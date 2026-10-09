/**
 * Similarity: how alike two cells, columns or tables are, by the values they hold.
 */
import { uniqueValues } from "./helpers";

/** What a column or table holds, duplicates counted. */
export type ValueCounts = Record<string, number>;

/**
 * Counts values, empty ones left out.
 * @param values The values.
 * @returns The counts.
 */
export function countValues(values: string[]): ValueCounts {
    const counts: ValueCounts = Object.create(null) as ValueCounts;
    values.forEach((value) => {
        if (value !== "") {
            counts[value] = (counts[value] || 0) + 1;
        }
    });
    return counts;
}

/**
 * How many distinct values there are.
 * @param counts The counts.
 * @returns The number of distinct values.
 */
export function countsSize(counts: ValueCounts): number {
    return Object.keys(counts).length;
}

/**
 * The share of the old values still present in the new.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1.
 */
export function retainedShare(oldCounts: ValueCounts, newCounts: ValueCounts): number {
    let shared = 0;
    let total = 0;
    Object.keys(oldCounts).forEach((value) => {
        shared += Math.min(oldCounts[value], newCounts[value] || 0);
        total += oldCounts[value];
    });
    return total === 0 ? 0 : shared / total;
}

/**
 * The share of all values the two sides have in common.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
export function valueOverlap(oldCounts: ValueCounts, newCounts: ValueCounts): number {
    if (countsSize(oldCounts) === 0 && countsSize(newCounts) === 0) {
        return NaN;
    }
    let shared = 0;
    let total = 0;
    uniqueValues(Object.keys(oldCounts).concat(Object.keys(newCounts))).forEach((value) => {
        const oldCount = oldCounts[value] || 0;
        const newCount = newCounts[value] || 0;
        shared += Math.min(oldCount, newCount);
        total += Math.max(oldCount, newCount);
    });
    return shared / total;
}

/**
 * The share of the smaller side's values the two sides have in common: rows come and go all
 * the time, so a column or table is judged on what both versions could hold, not on the rows
 * one of them added.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
export function sharedShare(oldCounts: ValueCounts, newCounts: ValueCounts): number {
    let oldTotal = 0;
    let newTotal = 0;
    let shared = 0;
    Object.keys(oldCounts).forEach((value) => {
        oldTotal += oldCounts[value];
    });
    Object.keys(newCounts).forEach((value) => {
        newTotal += newCounts[value];
    });
    if (oldTotal === 0 && newTotal === 0) {
        return NaN;
    }
    if (oldTotal === 0 || newTotal === 0) {
        return 0;
    }
    Object.keys(oldCounts).forEach((value) => {
        shared += Math.min(oldCounts[value], newCounts[value] || 0);
    });
    return shared / Math.min(oldTotal, newTotal);
}

/**
 * The share of the smaller side's cells a shared value accounts for, every shared value counted
 * once however often it repeats: a few filler values repeated over many cells say little about
 * two tables being the same table.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
export function distinctSharedShare(oldCounts: ValueCounts, newCounts: ValueCounts): number {
    let oldTotal = 0;
    let newTotal = 0;
    Object.keys(oldCounts).forEach((value) => {
        oldTotal += oldCounts[value];
    });
    Object.keys(newCounts).forEach((value) => {
        newTotal += newCounts[value];
    });
    if (oldTotal === 0 && newTotal === 0) {
        return NaN;
    }
    if (oldTotal === 0 || newTotal === 0) {
        return 0;
    }
    const shared = Object.keys(oldCounts).filter((value) => newCounts[value] !== undefined).length;
    return shared / Math.min(oldTotal, newTotal);
}

/**
 * How much of what a cell said is still there: the share of words the two cells have in
 * common. An edited cell keeps most of its words, a cell that was replaced keeps none.
 * @param oldSignature The old cell's signature.
 * @param newSignature The new cell's signature.
 * @returns 0..1.
 */
export function cellSimilarity(oldSignature: string, newSignature: string): number {
    if (oldSignature === newSignature) {
        return 1;
    }
    return wordSimilarity(signatureWords(oldSignature), signatureWords(newSignature));
}

/**
 * The distinct words of a signature, in order, so they are read once per cell and not on every
 * comparison.
 * @param signature The cell's signature.
 * @returns The words.
 */
export function signatureWords(signature: string): string[] {
    return uniqueValues(signature.split(/[\s|]+/).filter((word) => word !== ""));
}

/**
 * cellSimilarity on words read once: the share of words the two cells have in common.
 * @param oldWords The old cell's distinct words.
 * @param newWords The new cell's distinct words.
 * @returns 0..1.
 */
export function wordSimilarity(oldWords: string[], newWords: string[]): number {
    const newSet = new Set(newWords);
    let shared = 0;
    oldWords.forEach((word) => {
        if (newSet.has(word)) {
            shared++;
        }
    });
    const total = oldWords.length + newWords.length - shared;
    return total === 0 ? 1 : shared / total;
}
