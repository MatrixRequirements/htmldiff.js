"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cellSimilarity = exports.distinctSharedShare = exports.sharedShare = exports.valueOverlap = exports.retainedShare = exports.countsSize = exports.countValues = void 0;
/**
 * Similarity: how alike two cells, columns or tables are, by the values they hold.
 */
const helpers_1 = require("./helpers");
/**
 * Counts values, empty ones left out.
 * @param values The values.
 * @returns The counts.
 */
function countValues(values) {
    const counts = Object.create(null);
    values.forEach((value) => {
        if (value !== "") {
            counts[value] = (counts[value] || 0) + 1;
        }
    });
    return counts;
}
exports.countValues = countValues;
/**
 * How many distinct values there are.
 * @param counts The counts.
 * @returns The number of distinct values.
 */
function countsSize(counts) {
    return Object.keys(counts).length;
}
exports.countsSize = countsSize;
/**
 * The share of the old values still present in the new.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1.
 */
function retainedShare(oldCounts, newCounts) {
    let shared = 0;
    let total = 0;
    Object.keys(oldCounts).forEach((value) => {
        shared += Math.min(oldCounts[value], newCounts[value] || 0);
        total += oldCounts[value];
    });
    return total === 0 ? 0 : shared / total;
}
exports.retainedShare = retainedShare;
/**
 * The share of all values the two sides have in common.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
function valueOverlap(oldCounts, newCounts) {
    if (countsSize(oldCounts) === 0 && countsSize(newCounts) === 0) {
        return NaN;
    }
    let shared = 0;
    let total = 0;
    (0, helpers_1.uniqueValues)(Object.keys(oldCounts).concat(Object.keys(newCounts))).forEach((value) => {
        const oldCount = oldCounts[value] || 0;
        const newCount = newCounts[value] || 0;
        shared += Math.min(oldCount, newCount);
        total += Math.max(oldCount, newCount);
    });
    return shared / total;
}
exports.valueOverlap = valueOverlap;
/**
 * The share of the smaller side's values the two sides have in common: rows come and go all
 * the time, so a column or table is judged on what both versions could hold, not on the rows
 * one of them added.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
function sharedShare(oldCounts, newCounts) {
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
exports.sharedShare = sharedShare;
/**
 * The share of the smaller side's cells a shared value accounts for, every shared value counted
 * once however often it repeats: a few filler values repeated over many cells say little about
 * two tables being the same table.
 * @param oldCounts The old values.
 * @param newCounts The new values.
 * @returns 0..1, NaN when both sides are empty.
 */
function distinctSharedShare(oldCounts, newCounts) {
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
exports.distinctSharedShare = distinctSharedShare;
/**
 * How much of what a cell said is still there: the share of words the two cells have in
 * common. An edited cell keeps most of its words, a cell that was replaced keeps none.
 * @param oldSignature The old cell's signature.
 * @param newSignature The new cell's signature.
 * @returns 0..1.
 */
function cellSimilarity(oldSignature, newSignature) {
    if (oldSignature === newSignature) {
        return 1;
    }
    const words = (signature) => (0, helpers_1.uniqueValues)(signature.split(/[\s|]+/).filter((word) => word !== ""));
    const oldWords = words(oldSignature);
    const newWords = words(newSignature);
    const shared = oldWords.filter((word) => newWords.indexOf(word) !== -1).length;
    const total = (0, helpers_1.uniqueValues)(oldWords.concat(newWords)).length;
    return total === 0 ? 1 : shared / total;
}
exports.cellSimilarity = cellSimilarity;
