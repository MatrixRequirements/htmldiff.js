// Calculates the differences into a list of edit operations.
import { expect } from "chai";
import { calculateOperations, Operation } from "./operations";
import { htmlToTokens } from "./tokens";

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

    // elements htmldiff treats as one token: a change inside them is a replacement of the whole
    describe("atomic elements", () => {
        const equalOperation = { action: "equal", startInBefore: 0, endInBefore: 0, startInAfter: 0, endInAfter: 0 };
        const replaceOperation = { action: "replace", startInBefore: 0, endInBefore: 0, startInAfter: 0, endInAfter: 0 };

        describe("Image Differences", () => {
            it("show two images as different if their src attributes are different", () => {
                const ops = cut(tokenize('<img src="a.jpg">'), tokenize('<img src="b.jpg">'));
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(replaceOperation);
            });

            it("should show two images are the same if their src attributes are the same", () => {
                const ops = cut(tokenize('<img src="a.jpg">'), tokenize('<img src="a.jpg" alt="hey!">'));
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(equalOperation);
            });
        });

        describe("Widget Differences", () => {
            it("show two widgets as different if their data attributes are different", () => {
                const ops = cut(tokenize('<object data="a.jpg"></object>'), tokenize('<object data="b.jpg"></object>'));
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(replaceOperation);
            });

            it("should show two widgets are the same if their data attributes are the same", () => {
                const ops = cut(
                    tokenize('<object data="a.jpg"><param>yo!</param></object>'),
                    tokenize('<object data="a.jpg"></object>'),
                );
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(equalOperation);
            });
        });

        describe("Math Differences", () => {
            it("should show two math elements as different if their contents are different", () => {
                const ops = cut(
                    tokenize('<math data-uuid="55784cd906504787a8e459e80e3bb554"><msqrt><msup><mi>b</mi><mn>2</mn></msup></msqrt></math>'),
                    tokenize('<math data-uuid="55784cd906504787a8e459e80e3bb554"><msqrt><msup><mn>b</mn><mn>5</mn></msup></msqrt></math>'),
                );
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(replaceOperation);
            });

            it("should show two math elements as the same if their contents are the same", () => {
                const ops = cut(
                    tokenize('<math data-uuid="15568cd906504876548459e80e356878"><msqrt><msup><mi>b</mi><mn>2</mn></msup></msqrt></math>'),
                    tokenize('<math data-uuid="55784cd906504787a8e459e80e3bb554"><msqrt><msup><mi>b</mi><mn>2</mn></msup></msqrt></math>'),
                );
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(equalOperation);
            });
        });

        describe("Video Differences", () => {
            it("show two widgets as different if their data attributes are different", () => {
                const ops = cut(
                    tokenize('<video data-uuid="0787866ab5494d88b4b1ee423453224b"><source src="inkling-video:///big_buck_bunny/webm_high" type="video/webm" /></video>'),
                    tokenize('<video data-uuid="0787866ab5494d88b4b1ee423453224b"><source src="inkling-video:///big_buck_rabbit/mp4" type="video/webm" /></video>'),
                );
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(replaceOperation);
            });

            it("should show two widgets are the same if their data attributes are the same", () => {
                const ops = cut(
                    tokenize('<video data-uuid="65656565655487787484545454548494"><source src="inkling-video:///big_buck_bunny/webm_high" type="video/webm" /></video>'),
                    tokenize('<video data-uuid="0787866ab5494d88b4b1ee423453224b"><source src="inkling-video:///big_buck_bunny/webm_high" type="video/webm" /></video>'),
                );
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(equalOperation);
            });
        });

        describe("iframe Differences", () => {
            it("show two widgets as different if their data attributes are different", () => {
                const ops = cut(tokenize('<iframe src="a.jpg"></iframe>'), tokenize('<iframe src="b.jpg"></iframe>'));
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(replaceOperation);
            });

            it("should show two widgets are the same if their data attributes are the same", () => {
                const ops = cut(tokenize('<iframe src="a.jpg"></iframe>'), tokenize('<iframe src="a.jpg" class="foo"></iframe>'));
                expect(ops.length).to.equal(1);
                expect(ops[0]).to.eql(equalOperation);
            });
        });
    });
});
