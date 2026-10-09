/**
 * Pairs the entries of two sequences, tables, columns or rows, and says which entries were
 * added or deleted.
 */
import { range } from "./helpers";

/** An entry of the new sequence with its old counterpart, or an entry only one side has. */
export type Alignment =
    | { kind: "same"; oldIndex: number; newIndex: number }
    | { kind: "added"; newIndex: number }
    | { kind: "deleted"; oldIndex: number };

/** An alignment of an entry both sides have. */
export type SameAlignment = Extract<Alignment, { kind: "same" }>;

/** An old entry and the new entry it is. */
export interface IndexPair {
    oldIndex: number;
    newIndex: number;
}

/** The entries on both sides between two matched pairs, half-open index ranges. */
export interface UnmatchedRange {
    oldStart: number;
    oldEnd: number;
    newStart: number;
    newEnd: number;
}

/**
 * What content matching leaves over: blank entries pair by position, they have nothing else
 * to tell them apart. With pairsInPlace, so does everything else when both sides have the same
 * amount of it and the check passes for the pair. An entry with an identity of its own never
 * does: it is added or deleted, not replaced in place.
 */
export interface PositionalPairing {
    pairsInPlace?: (oldIndex: number, newIndex: number) => boolean;
    isOldBlank: (oldIndex: number) => boolean;
    isNewBlank: (newIndex: number) => boolean;
    hasOldIdentity?: (oldIndex: number) => boolean;
    hasNewIdentity?: (newIndex: number) => boolean;
}

/** Two sequences and how to compare their entries. */
export interface Sequence {
    oldCount: number;
    newCount: number;
    /** 0..1, NaN when both entries are blank and carry no identity. */
    similarity: (oldIndex: number, newIndex: number) => number;
    /**
     * (Optional) Whether two entries are exactly the same, when the sequence can tell that
     * cheaper than through similarity: must agree with similarity === 1.
     */
    isExact?: (oldIndex: number, newIndex: number) => boolean;
    byPosition: PositionalPairing;
}

/** Pairs the entries of two sequences. */
export class SequenceAligner {
    private readonly sequence: Sequence;

    /**
     * @param sequence The two sequences and how to compare their entries.
     */
    constructor(sequence: Sequence) {
        this.sequence = sequence;
    }

    /**
     * Exact matches anchor first, similar entries pair up inside the unmatched ranges, and what
     * is left in a range pairs by position only where the sequence allows it. Moves fall out as
     * delete + add.
     * @returns The alignments in the order of the new sequence, deleted entries where they were.
     */
    align(): Alignment[] {
        const sequence = this.sequence;
        const exact = sequence.isExact ?? ((oldIndex: number, newIndex: number): boolean => sequence.similarity(oldIndex, newIndex) === 1);
        // half the cells (rows) or values (columns) in common is enough to be the same entry, edited
        const similar = (oldIndex: number, newIndex: number): boolean => sequence.similarity(oldIndex, newIndex) >= 0.5;
        const whole: UnmatchedRange = { oldStart: 0, oldEnd: sequence.oldCount, newStart: 0, newEnd: sequence.newCount };

        let pairs = SequenceAligner.matchInOrder(whole, exact);
        pairs = this.fillUnmatchedRanges(pairs, (unmatched) => SequenceAligner.matchInOrder(unmatched, similar));
        pairs = this.fillUnmatchedRanges(pairs, (unmatched) => SequenceAligner.pairByPosition(sequence.byPosition, unmatched));

        return SequenceAligner.toAlignments(pairs, sequence.oldCount, sequence.newCount);
    }

    /**
     * Pairs more entries inside the ranges the pairs so far leave unmatched.
     * @param pairs The pairs so far, in order.
     * @param pairUnmatched Pairs the entries of one unmatched range.
     * @returns All pairs, in order.
     */
    private fillUnmatchedRanges(pairs: IndexPair[], pairUnmatched: (unmatched: UnmatchedRange) => IndexPair[]): IndexPair[] {
        const sequence = this.sequence;
        const result: IndexPair[] = [];
        let oldStart = 0;
        let newStart = 0;

        pairs.concat([{ oldIndex: sequence.oldCount, newIndex: sequence.newCount }]).forEach((pair) => {
            if (pair.oldIndex > oldStart && pair.newIndex > newStart) {
                pairUnmatched({ oldStart, oldEnd: pair.oldIndex, newStart, newEnd: pair.newIndex }).forEach((unmatchedPair) => result.push(unmatchedPair));
            }
            if (pair.oldIndex < sequence.oldCount) {
                result.push(pair);
            }
            oldStart = pair.oldIndex + 1;
            newStart = pair.newIndex + 1;
        });

        return result;
    }

    /**
     * Pairs the entries of an unmatched range by position, as far as the rules allow it.
     * @param byPosition The rules.
     * @param unmatched The range.
     * @returns The pairs, in order.
     */
    static pairByPosition(byPosition: PositionalPairing, unmatched: UnmatchedRange): IndexPair[] {
        const oldIndexes = range(unmatched.oldStart, unmatched.oldEnd).filter(
            (oldIndex) => !(byPosition.hasOldIdentity && byPosition.hasOldIdentity(oldIndex)),
        );
        const newIndexes = range(unmatched.newStart, unmatched.newEnd).filter(
            (newIndex) => !(byPosition.hasNewIdentity && byPosition.hasNewIdentity(newIndex)),
        );

        const pairsInPlace = byPosition.pairsInPlace;
        if (pairsInPlace && oldIndexes.length === newIndexes.length) {
            return oldIndexes
                .map((oldIndex, offset) => ({ oldIndex, newIndex: newIndexes[offset] }))
                .filter((pair) => pairsInPlace(pair.oldIndex, pair.newIndex));
        }

        // only blank entries have nothing else to tell them apart, the rest is added/deleted. a blank
        // entry pairs with a blank one, else with the entry in its place: an empty row that got
        // content was filled, not replaced
        const blankOld = oldIndexes.filter(byPosition.isOldBlank);
        const blankNew = newIndexes.filter(byPosition.isNewBlank);
        const blankPairs: (IndexPair | null)[] = range(0, Math.min(blankOld.length, blankNew.length)).map((offset) => ({
            oldIndex: blankOld[offset],
            newIndex: blankNew[offset],
        }));

        const pairs: IndexPair[] = [];
        let oldPosition = 0;
        let newPosition = 0;
        blankPairs.concat([null]).forEach((blankPair) => {
            const oldEnd = blankPair ? oldIndexes.indexOf(blankPair.oldIndex) : oldIndexes.length;
            const newEnd = blankPair ? newIndexes.indexOf(blankPair.newIndex) : newIndexes.length;
            range(0, Math.min(oldEnd - oldPosition, newEnd - newPosition)).forEach((offset) => {
                const oldIndex = oldIndexes[oldPosition + offset];
                const newIndex = newIndexes[newPosition + offset];
                if (byPosition.isOldBlank(oldIndex) || byPosition.isNewBlank(newIndex)) {
                    pairs.push({ oldIndex, newIndex });
                }
            });
            if (blankPair) {
                pairs.push(blankPair);
            }
            oldPosition = oldEnd + 1;
            newPosition = newEnd + 1;
        });
        return pairs;
    }

    /**
     * The longest in-order run of matching entries, by dynamic programming.
     * @param unmatched The range to match in.
     * @param matches Whether two entries match.
     * @returns The pairs, in order.
     */
    static matchInOrder(unmatched: UnmatchedRange, matches: (oldIndex: number, newIndex: number) => boolean): IndexPair[] {
        const oldStart = unmatched.oldStart;
        const newStart = unmatched.newStart;
        const oldLength = unmatched.oldEnd - oldStart;
        const newLength = unmatched.newEnd - newStart;
        // one flat table, lengths[i][j] at i * width + j, the last row and column stay 0
        const width = newLength + 1;
        const lengths = new Int32Array((oldLength + 1) * width);

        for (let i = oldLength - 1; i >= 0; i--) {
            for (let j = newLength - 1; j >= 0; j--) {
                lengths[i * width + j] = matches(oldStart + i, newStart + j)
                    ? lengths[(i + 1) * width + j + 1] + 1
                    : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
            }
        }

        const pairs: IndexPair[] = [];
        let oldOffset = 0;
        let newOffset = 0;
        while (oldOffset < oldLength && newOffset < newLength) {
            if (matches(oldStart + oldOffset, newStart + newOffset)) {
                pairs.push({ oldIndex: oldStart + oldOffset, newIndex: newStart + newOffset });
                oldOffset++;
                newOffset++;
                continue;
            }
            if (lengths[(oldOffset + 1) * width + newOffset] >= lengths[oldOffset * width + newOffset + 1]) {
                oldOffset++;
                continue;
            }
            newOffset++;
        }

        return pairs;
    }

    /**
     * The alignments of two sequences from their pairs: deleted entries come before the added
     * entries of the same gap, both before the pair that ends the gap.
     * @param pairs The pairs, in order.
     * @param oldCount The length of the old sequence.
     * @param newCount The length of the new sequence.
     * @returns The alignments.
     */
    static toAlignments(pairs: IndexPair[], oldCount: number, newCount: number): Alignment[] {
        const alignments: Alignment[] = [];
        let oldIndex = 0;
        let newIndex = 0;

        pairs.concat([{ oldIndex: oldCount, newIndex: newCount }]).forEach((pair) => {
            for (; oldIndex < pair.oldIndex; oldIndex++) {
                alignments.push({ kind: "deleted", oldIndex });
            }
            for (; newIndex < pair.newIndex; newIndex++) {
                alignments.push({ kind: "added", newIndex });
            }
            if (pair.oldIndex < oldCount) {
                alignments.push({ kind: "same", oldIndex: pair.oldIndex, newIndex: pair.newIndex });
                oldIndex++;
                newIndex++;
            }
        });

        return alignments;
    }
}
