import { expect } from "chai";
import { PositionalPairing, Sequence, SequenceAligner } from "../../src/tables/SequenceAligner";

describe("SequenceAligner", () => {
    const sequence = (oldValues: string[], newValues: string[], byPosition: Partial<PositionalPairing> = {}): Sequence => ({
        oldCount: oldValues.length,
        newCount: newValues.length,
        similarity: (oldIndex, newIndex) => {
            if (oldValues[oldIndex] === "" && newValues[newIndex] === "") return NaN;
            return oldValues[oldIndex] === newValues[newIndex] ? 1 : 0;
        },
        byPosition: {
            isOldBlank: (oldIndex) => oldValues[oldIndex] === "",
            isNewBlank: (newIndex) => newValues[newIndex] === "",
            ...byPosition,
        },
    });

    describe("matchInOrder", () => {
        it("finds the longest in-order run of matches", () => {
            const pairs = SequenceAligner.matchInOrder(
                { oldStart: 0, oldEnd: 3, newStart: 0, newEnd: 3 },
                (o, n) => ["a", "b", "c"][o] === ["c", "a", "b"][n],
            );
            expect(pairs).to.deep.equal([
                { oldIndex: 0, newIndex: 1 },
                { oldIndex: 1, newIndex: 2 },
            ]);
        });
    });

    describe("toAlignments", () => {
        it("puts deleted before added inside a gap", () => {
            expect(SequenceAligner.toAlignments([{ oldIndex: 1, newIndex: 1 }], 2, 3)).to.deep.equal([
                { kind: "deleted", oldIndex: 0 },
                { kind: "added", newIndex: 0 },
                { kind: "same", oldIndex: 1, newIndex: 1 },
                { kind: "added", newIndex: 2 },
            ]);
        });
    });

    describe("pairByPosition", () => {
        it("pairs everything in place when counts match and pairsInPlace allows", () => {
            const pairs = SequenceAligner.pairByPosition(
                { pairsInPlace: (o) => o !== 1, isOldBlank: () => false, isNewBlank: () => false },
                { oldStart: 0, oldEnd: 2, newStart: 0, newEnd: 2 },
            );
            expect(pairs).to.deep.equal([{ oldIndex: 0, newIndex: 0 }]);
        });

        it("pairs a blank entry with a blank one, else with the entry in its place", () => {
            const blankFirst = (index: number): boolean => index === 0;
            expect(
                SequenceAligner.pairByPosition(
                    { isOldBlank: blankFirst, isNewBlank: (index) => index === 1 },
                    { oldStart: 0, oldEnd: 2, newStart: 0, newEnd: 2 },
                ),
            ).to.deep.equal([{ oldIndex: 0, newIndex: 1 }]);
            expect(
                SequenceAligner.pairByPosition({ isOldBlank: blankFirst, isNewBlank: () => false }, { oldStart: 0, oldEnd: 1, newStart: 0, newEnd: 2 }),
            ).to.deep.equal([{ oldIndex: 0, newIndex: 0 }]);
        });

        it("never pairs an entry with an identity by position", () => {
            const pairs = SequenceAligner.pairByPosition(
                {
                    pairsInPlace: () => true,
                    isOldBlank: () => true,
                    isNewBlank: () => true,
                    hasOldIdentity: () => true,
                    hasNewIdentity: () => false,
                },
                { oldStart: 0, oldEnd: 1, newStart: 0, newEnd: 1 },
            );
            expect(pairs).to.deep.equal([]);
        });
    });

    describe("align", () => {
        it("anchors exact matches and turns a move into delete and add", () => {
            expect(new SequenceAligner(sequence(["a", "b", "c"], ["c", "a", "b"])).align()).to.deep.equal([
                { kind: "added", newIndex: 0 },
                { kind: "same", oldIndex: 0, newIndex: 1 },
                { kind: "same", oldIndex: 1, newIndex: 2 },
                { kind: "deleted", oldIndex: 2 },
            ]);
        });

        it("pairs blank entries left over by position", () => {
            expect(new SequenceAligner(sequence(["a", ""], ["a", ""])).align()).to.deep.equal([
                { kind: "same", oldIndex: 0, newIndex: 0 },
                { kind: "same", oldIndex: 1, newIndex: 1 },
            ]);
        });

        it("pairs similar entries inside the gaps", () => {
            const seq = sequence(["a", "x", "c"], ["a", "y", "c"]);
            seq.similarity = (o, n) => (o === n ? (o === 1 ? 0.6 : 1) : 0);
            expect(new SequenceAligner(seq).align()).to.deep.equal([
                { kind: "same", oldIndex: 0, newIndex: 0 },
                { kind: "same", oldIndex: 1, newIndex: 1 },
                { kind: "same", oldIndex: 2, newIndex: 2 },
            ]);
        });
    });
});
