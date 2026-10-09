import { expect } from "chai";
import {
    cellSimilarity,
    countsSize,
    countValues,
    distinctSharedShare,
    retainedShare,
    sharedShare,
    signatureWords,
    valueOverlap,
    wordSimilarity,
} from "./similarity";

describe("similarity", () => {
    describe("countValues", () => {
        it("counts values, empty ones left out", () => {
            const counts = countValues(["a", "", "b", "a"]);
            expect(counts).to.deep.equal({ a: 2, b: 1 });
            expect(countsSize(counts)).to.equal(2);
        });
    });

    describe("retainedShare", () => {
        it("is the share of old values still there", () => {
            expect(retainedShare({ a: 1, b: 1 }, { a: 1, c: 1 })).to.equal(0.5);
            expect(retainedShare({}, { a: 1 })).to.equal(0);
        });
    });

    describe("valueOverlap", () => {
        it("is the shared share of all values", () => {
            expect(valueOverlap({ a: 1, b: 1 }, { a: 1, c: 1, d: 1 })).to.equal(0.25);
        });

        it("is NaN when both sides are empty", () => {
            expect(isNaN(valueOverlap({}, {}))).to.equal(true);
        });
    });

    describe("sharedShare", () => {
        it("judges on the smaller side", () => {
            expect(sharedShare({ a: 1, b: 1 }, { a: 1, b: 1, c: 1, d: 1, e: 1 })).to.equal(1);
            expect(sharedShare({ a: 1, b: 1, c: 1, d: 1 }, { a: 1, x: 1 })).to.equal(0.5);
        });

        it("is 0 when one side is empty and NaN when both are", () => {
            expect(sharedShare({}, { a: 1 })).to.equal(0);
            expect(isNaN(sharedShare({}, {}))).to.equal(true);
        });
    });

    describe("distinctSharedShare", () => {
        it("counts a shared value once, against the smaller side's cells", () => {
            expect(distinctSharedShare({ a: 2, b: 1, c: 1 }, { a: 4, b: 2 })).to.equal(0.5);
            expect(distinctSharedShare({ a: 1, b: 1, c: 1, d: 1 }, { a: 1, b: 1 })).to.equal(1);
        });

        it("is 0 when one side is empty and NaN when both are", () => {
            expect(distinctSharedShare({}, { a: 1 })).to.equal(0);
            expect(isNaN(distinctSharedShare({}, {}))).to.equal(true);
        });
    });

    describe("cellSimilarity", () => {
        it("is the share of words in common", () => {
            expect(cellSimilarity("a b c", "a b d")).to.equal(0.5);
            expect(cellSimilarity("same", "same")).to.equal(1);
            expect(cellSimilarity("x", "y")).to.equal(0);
        });

        it("splits signatures on the id separator too", () => {
            expect(cellSimilarity("a b|X", "a c|X")).to.equal(0.5);
        });

        it("is 1 for two empty cells", () => {
            expect(cellSimilarity("", "")).to.equal(1);
        });
    });

    describe("signatureWords", () => {
        it("lists the distinct words of a signature in order", () => {
            expect(signatureWords("b a|X b")).to.deep.equal(["b", "a", "X"]);
            expect(signatureWords("")).to.deep.equal([]);
            expect(signatureWords(" | ")).to.deep.equal([]);
        });
    });

    describe("wordSimilarity", () => {
        it("is cellSimilarity on the words read once", () => {
            const pairs = [
                ["a b c", "a b d"],
                ["same", "same"],
                ["x", "y"],
                ["a b|X", "a c|X"],
                ["", ""],
                ["", "x"],
                ["b a", "a b"],
                ["a a", "a"],
                ["|", ""],
            ];
            pairs.forEach(([oldSignature, newSignature]) => {
                expect(wordSimilarity(signatureWords(oldSignature), signatureWords(newSignature))).to.equal(cellSimilarity(oldSignature, newSignature));
            });
        });
    });
});
