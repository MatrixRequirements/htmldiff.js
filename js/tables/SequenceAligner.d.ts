/** An entry of the new sequence with its old counterpart, or an entry only one side has. */
export declare type Alignment = {
    kind: "same";
    oldIndex: number;
    newIndex: number;
} | {
    kind: "added";
    newIndex: number;
} | {
    kind: "deleted";
    oldIndex: number;
};
/** An alignment of an entry both sides have. */
export declare type SameAlignment = Extract<Alignment, {
    kind: "same";
}>;
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
    byPosition: PositionalPairing;
}
/** Pairs the entries of two sequences. */
export declare class SequenceAligner {
    private readonly sequence;
    /**
     * @param sequence The two sequences and how to compare their entries.
     */
    constructor(sequence: Sequence);
    /**
     * Exact matches anchor first, similar entries pair up inside the unmatched ranges, and what
     * is left in a range pairs by position only where the sequence allows it. Moves fall out as
     * delete + add.
     * @returns The alignments in the order of the new sequence, deleted entries where they were.
     */
    align(): Alignment[];
    /**
     * Pairs more entries inside the ranges the pairs so far leave unmatched.
     * @param pairs The pairs so far, in order.
     * @param pairUnmatched Pairs the entries of one unmatched range.
     * @returns All pairs, in order.
     */
    private fillUnmatchedRanges;
    /**
     * Pairs the entries of an unmatched range by position, as far as the rules allow it.
     * @param byPosition The rules.
     * @param unmatched The range.
     * @returns The pairs, in order.
     */
    static pairByPosition(byPosition: PositionalPairing, unmatched: UnmatchedRange): IndexPair[];
    /**
     * The longest in-order run of matching entries, by dynamic programming.
     * @param unmatched The range to match in.
     * @param matches Whether two entries match.
     * @returns The pairs, in order.
     */
    static matchInOrder(unmatched: UnmatchedRange, matches: (oldIndex: number, newIndex: number) => boolean): IndexPair[];
    /**
     * The alignments of two sequences from their pairs: deleted entries come before the added
     * entries of the same gap, both before the pair that ends the gap.
     * @param pairs The pairs, in order.
     * @param oldCount The length of the old sequence.
     * @param newCount The length of the new sequence.
     * @returns The alignments.
     */
    static toAlignments(pairs: IndexPair[], oldCount: number, newCount: number): Alignment[];
}
