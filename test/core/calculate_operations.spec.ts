// Calculates the differences into a list of edit operations.
import { expect } from "chai";
import { calculateOperations, Operation } from "../../src/core/operations";
import { htmlToTokens } from "../../src/core/tokens";

describe("calculateOperations", () => {
    const cut = calculateOperations;
    const tokenize = htmlToTokens;
    let res: Operation[];

    it("should be a function", () => {
        expect(cut).is.a("function");
    });

    describe("Actions", () => {
        describe("In the middle", () => {
            describe("Replace", () => {
                beforeEach(() => {
                    res = cut(tokenize("working on it"), tokenize("working in it"));
                });

                it("should result in 3 operations", () => {
                    expect(res.length).to.equal(3);
                });

                it('should replace "on"', () => {
                    expect(res[1]).eql({ action: "replace", startInBefore: 2, endInBefore: 2, startInAfter: 2, endInAfter: 2 });
                });
            });

            describe("Insert", () => {
                beforeEach(() => {
                    res = cut(tokenize("working it"), tokenize("working in it"));
                });

                it("should result in 3 operations", () => {
                    expect(res.length).to.equal(3);
                });

                it('should show an insert for "on"', () => {
                    expect(res[1]).eql({ action: "insert", startInBefore: 2, endInBefore: null, startInAfter: 2, endInAfter: 3 });
                });

                describe("More than one word", () => {
                    beforeEach(() => {
                        res = cut(tokenize("working it"), tokenize("working all up on it"));
                    });

                    it("should still have 3 operations", () => {
                        expect(res.length).to.equal(3);
                    });

                    it("should show a big insert", () => {
                        expect(res[1]).eql({ action: "insert", startInBefore: 2, endInBefore: null, startInAfter: 2, endInAfter: 7 });
                    });
                });
            });

            describe("Delete", () => {
                beforeEach(() => {
                    res = cut(tokenize("this is a lot of text"), tokenize("this is text"));
                });

                it("should return 3 operations", () => {
                    expect(res.length).to.equal(3);
                });

                it("should show the delete in the middle", () => {
                    expect(res[1]).eql({ action: "delete", startInBefore: 4, endInBefore: 9, startInAfter: 4, endInAfter: null });
                });
            });

            describe("Equal", () => {
                beforeEach(() => {
                    res = cut(tokenize("this is what it sounds like"), tokenize("this is what it sounds like"));
                });

                it("should return a single op", () => {
                    expect(res.length).to.equal(1);
                    expect(res[0]).eql({ action: "equal", startInBefore: 0, endInBefore: 10, startInAfter: 0, endInAfter: 10 });
                });
            });
        });

        describe("At the beginning", () => {
            describe("Replace", () => {
                beforeEach(() => {
                    res = cut(tokenize("I dont like veggies"), tokenize("Joe loves veggies"));
                });

                it("should return 2 operations", () => {
                    expect(res.length).to.equal(2);
                });

                it("should have a replace at the beginning", () => {
                    expect(res[0]).eql({ action: "replace", startInBefore: 0, endInBefore: 4, startInAfter: 0, endInAfter: 2 });
                });
            });

            describe("Insert", () => {
                beforeEach(() => {
                    res = cut(tokenize("dog"), tokenize("the shaggy dog"));
                });

                it("should return 2 operations", () => {
                    expect(res.length).to.equal(2);
                });

                it("should have an insert at the beginning", () => {
                    expect(res[0]).eql({ action: "insert", startInBefore: 0, endInBefore: null, startInAfter: 0, endInAfter: 3 });
                });
            });

            describe("Delete", () => {
                beforeEach(() => {
                    res = cut(tokenize("awesome dog barks"), tokenize("dog barks"));
                });

                it("should return 2 operations", () => {
                    expect(res.length).to.equal(2);
                });

                it("should have a delete at the beginning", () => {
                    expect(res[0]).eql({ action: "delete", startInBefore: 0, endInBefore: 1, startInAfter: 0, endInAfter: null });
                });
            });
        });

        describe("At the end", () => {
            describe("Replace", () => {
                beforeEach(() => {
                    res = cut(tokenize("the dog bit the cat"), tokenize("the dog bit a bird"));
                });

                it("should return 2 operations", () => {
                    expect(res.length).to.equal(2);
                });

                it("should have a replace at the end", () => {
                    expect(res[1]).eql({ action: "replace", startInBefore: 6, endInBefore: 8, startInAfter: 6, endInAfter: 8 });
                });
            });

            describe("Insert", () => {
                beforeEach(() => {
                    res = cut(tokenize("this is a dog"), tokenize("this is a dog that barks"));
                });

                it("should return 2 operations", () => {
                    expect(res.length).to.equal(2);
                });

                it("should have an Insert at the end", () => {
                    expect(res[1]).eql({ action: "insert", startInBefore: 7, endInBefore: null, startInAfter: 7, endInAfter: 10 });
                });
            });

            describe("Delete", () => {
                beforeEach(() => {
                    res = cut(tokenize("this is a dog that barks"), tokenize("this is a dog"));
                });

                it("should have 2 operations", () => {
                    expect(res.length).to.equal(2);
                });

                it("should have a delete at the end", () => {
                    expect(res[1]).eql({ action: "delete", startInBefore: 7, endInBefore: 10, startInAfter: 7, endInAfter: null });
                });
            });
        });
    });

    describe("Action Combination", () => {
        describe("dont absorb non-single-whitespace tokens", () => {
            beforeEach(() => {
                res = cut(tokenize("I  am awesome"), tokenize("You  are great"));
            });

            it("should return 3 actions", () => {
                expect(res.length).to.equal(1);
            });

            it("should have a replace first", () => {
                expect(res[0].action).to.equal("replace");
            });
        });
    });
});
