import { expect } from "chai";
import { createMap, createSegment, findBestMatch, findMatchingBlocks, Match, TokenMap } from "./matching";
import { createToken, htmlToTokens, Token } from "./tokens";

describe("findMatchingBlocks", () => {
    const tokenize = (tokens: string[]): Token[] => tokens.map((token) => createToken(token));

    describe("createMap", () => {
        const cut = createMap;
        let res: TokenMap;

        it("should be a function", () => {
            expect(cut).is.a("function");
        });

        describe("When the items exist in the search target", () => {
            beforeEach(() => {
                res = cut(tokenize(["a", "apple", "has", "a", "worm"]));
            });

            it('should find "a" twice', () => {
                expect(res["a"].length).to.equal(2);
            });

            it('should find "a" at 0', () => {
                expect(res["a"][0]).to.equal(0);
            });

            it('should find "a" at 3', () => {
                expect(res["a"][1]).to.equal(3);
            });

            it('should find "has" at 2', () => {
                expect(res["has"][0]).to.equal(2);
            });
        });
    });

    describe("findBestMatch", () => {
        const cut = findBestMatch;
        let res: Match | null;
        const invoke = (before: Token[], after: Token[]): void => {
            res = cut(createSegment(before, after, 0, 0));
        };

        describe("When there is a match", () => {
            beforeEach(() => {
                invoke(tokenize(["a", "dog", "bites"]), tokenize(["a", "dog", "bites", "a", "man"]));
            });

            it("should match the match", () => {
                expect(res).to.exist;
                const match = res as Match;
                expect(match.startInBefore).equal(0);
                expect(match.startInAfter).equal(0);
                expect(match.length).equal(3);
                expect(match.endInBefore).equal(2);
                expect(match.endInAfter).equal(2);
            });

            describe("When the match is surrounded", () => {
                beforeEach(() => {
                    invoke(tokenize(["dog", "bites"]), tokenize(["the", "dog", "bites", "a", "man"]));
                });

                it("should match with appropriate indexing", () => {
                    expect(res).to.exist;
                    const match = res as Match;
                    expect(match.startInBefore).to.equal(0);
                    expect(match.startInAfter).to.equal(1);
                    expect(match.endInBefore).to.equal(1);
                    expect(match.endInAfter).to.equal(2);
                });
            });
        });

        describe("When there is no match", () => {
            beforeEach(() => {
                invoke(tokenize(["the", "rat", "sqeaks"]), tokenize(["a", "dog", "bites", "a", "man"]));
            });

            it("should return nothing", () => {
                expect(res).to.not.exist;
            });
        });
    });

    describe("findMatchingBlocks", () => {
        const cut = findMatchingBlocks;
        let res: Match[];

        it("should be a function", () => {
            expect(cut).is.a("function");
        });

        describe("When called with a single match", () => {
            beforeEach(() => {
                res = cut(createSegment(htmlToTokens("a dog bites"), htmlToTokens("when a dog bites it hurts"), 0, 0));
            });

            it("should return a match", () => {
                expect(res.length).to.equal(1);
            });
        });

        describe("When called with multiple matches", () => {
            beforeEach(() => {
                res = cut(createSegment(htmlToTokens("the dog bit a man"), htmlToTokens("the large brown dog bit a tall man"), 0, 0));
            });

            it("should return 3 matches", () => {
                expect(res.length).to.equal(3);
            });

            it('should match "the"', () => {
                expect(res[0].startInBefore).eql(0);
                expect(res[0].startInAfter).eql(0);
                expect(res[0].endInBefore).eql(0);
                expect(res[0].endInAfter).eql(0);
                expect(res[0].length).eql(1);
            });

            it('should match "dog bit a"', () => {
                expect(res[1].startInBefore).eql(1);
                expect(res[1].startInAfter).eql(5);
                expect(res[1].endInBefore).eql(7);
                expect(res[1].endInAfter).eql(11);
                expect(res[1].length).eql(7);
            });

            it('should match "man"', () => {
                expect(res[2].startInBefore).eql(8);
                expect(res[2].startInAfter).eql(14);
                expect(res[2].endInBefore).eql(8);
                expect(res[2].endInAfter).eql(14);
                expect(res[2].length).eql(1);
            });
        });
    });
});
