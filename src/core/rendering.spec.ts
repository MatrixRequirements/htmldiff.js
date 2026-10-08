import { expect } from "chai";
import { diffCore } from "./diff";
import { calculateOperations } from "./operations";
import { findOpeningTagEnd, isInnerDiffToken, renderInnerDiff, renderOperations, splitAtomicTokenString, wrap } from "./rendering";
import { createToken, Token } from "./tokens";

describe("rendering", () => {
    describe("findOpeningTagEnd", () => {
        it("finds the end of a plain opening tag", () => {
            expect(findOpeningTagEnd('<div class="a">text</div>')).to.equal(14);
        });

        it("skips a > inside a quoted attribute", () => {
            expect(findOpeningTagEnd('<div title="a > b">x</div>')).to.equal(18);
        });

        it("returns -1 for an unterminated tag", () => {
            expect(findOpeningTagEnd('<div title="a')).to.equal(-1);
        });
    });

    describe("splitAtomicTokenString", () => {
        it("splits an element into its tags and content", () => {
            expect(splitAtomicTokenString('<div a="b">content</div>')).to.deep.equal({ openingTag: '<div a="b">', innerHtml: "content", closingTag: "</div>" });
        });

        it("splits a self-closing element into its tag alone", () => {
            expect(splitAtomicTokenString('<img src="x" />')).to.deep.equal({ openingTag: '<img src="x" />', innerHtml: "", closingTag: "" });
        });

        it("returns null when no closing tag follows the content", () => {
            expect(splitAtomicTokenString("<div>content")).to.equal(null);
        });
    });

    describe("isInnerDiffToken", () => {
        it("accepts an atomic element that opted in", () => {
            expect(isInnerDiffToken('<div data-htmldiff-id="1" data-htmldiff-inner-diff="true">x</div>')).to.equal(true);
        });

        it("accepts a bare opt-in attribute", () => {
            expect(isInnerDiffToken('<div data-htmldiff-id="1" data-htmldiff-inner-diff>x</div>')).to.equal(true);
        });

        it("rejects an opt-out", () => {
            expect(isInnerDiffToken('<div data-htmldiff-id="1" data-htmldiff-inner-diff="false">x</div>')).to.equal(false);
        });

        it("rejects an element that is not atomic", () => {
            expect(isInnerDiffToken('<div data-htmldiff-inner-diff="true">x</div>')).to.equal(false);
        });
    });

    describe("wrap", () => {
        it("wraps text in the tag with the operation index", () => {
            expect(wrap("ins", ["hello", " ", "world"], 3)).to.equal('<ins data-operation-index="3">hello world</ins>');
        });

        it("adds the prefix and the class", () => {
            expect(wrap("del", ["x"], 0, "pre", "cls")).to.equal('<del data-pre-operation-index="0" class="cls">x</del>');
        });

        it("marks a tag inserted whole instead of wrapping it", () => {
            expect(wrap("ins", ["<b>", "x", "</b>"], 1)).to.equal('<b data-diff-node="ins" data-operation-index="1"><ins data-operation-index="1">x</ins></b>');
        });
    });

    describe("renderInnerDiff", () => {
        it("diffs the content with the injected diff and keeps the after tags", () => {
            const calls: [string, string][] = [];
            const result = renderInnerDiff('<div a="1">old</div>', '<div a="2">new</div>', (before, after) => {
                calls.push([before, after]);
                return `[${before}|${after}]`;
            });
            expect(calls).to.deep.equal([["old", "new"]]);
            expect(result).to.equal('<div a="2">[old|new]</div>');
        });

        it("renders the after token when a side cannot be split", () => {
            expect(renderInnerDiff("<div>old", "<div>new</div>", () => "x")).to.equal("<div>new</div>");
        });
    });

    describe("renderOperations", () => {
        const tokenize = (tokens: string[]): Token[] => tokens.map((token) => createToken(token));
        const cut = (before: Token[], after: Token[]): string => renderOperations(before, after, calculateOperations(before, after), diffCore);
        let res: string;

        it("should be a function", () => {
            expect(cut).is.a("function");
        });

        describe("equal", () => {
            beforeEach(() => {
                const before = tokenize(["this", " ", "is", " ", "a", " ", "test"]);
                res = cut(before, before);
            });

            it("should output the text", () => {
                expect(res).equal("this is a test");
            });
        });

        describe("insert", () => {
            beforeEach(() => {
                res = cut(tokenize(["this", " ", "is"]), tokenize(["this", " ", "is", " ", "a", " ", "test"]));
            });

            it("should wrap in an <ins>", () => {
                expect(res).equal('this is<ins data-operation-index="1"> a test</ins>');
            });
        });

        describe("delete", () => {
            beforeEach(() => {
                res = cut(tokenize(["this", " ", "is", " ", "a", " ", "test", " ", "of", " ", "stuff"]), tokenize(["this", " ", "is", " ", "a", " ", "test"]));
            });

            it("should wrap in a <del>", () => {
                expect(res).to.equal('this is a test<del data-operation-index="1"> of stuff</del>');
            });
        });

        describe("replace", () => {
            beforeEach(() => {
                res = cut(tokenize(["this", " ", "is", " ", "a", " ", "break"]), tokenize(["this", " ", "is", " ", "a", " ", "test"]));
            });

            it("should wrap in both <ins> and <del>", () => {
                expect(res).to.equal('this is a <del data-operation-index="1">break</del>' + '<ins data-operation-index="1">test</ins>');
            });
        });

        describe("Dealing with tags", () => {
            let before: Token[];
            let after: Token[];

            beforeEach(() => {
                before = tokenize(["<p>", "a", "</p>"]);
                after = tokenize(["<p>", "a", " ", "b", "</p>", "<p>", "c", "</p>"]);
                res = cut(before, after);
            });

            it("should identify contained inserted tags", () => {
                expect(res).to.equal(
                    '<p>a<ins data-operation-index="1"> b</ins></p>' + '<p data-diff-node="ins" data-operation-index="3">' + '<ins data-operation-index="3">c</ins></p>',
                );
            });

            it("should identify contained deleted tags", () => {
                res = cut(after, before);

                expect(res).to.equal(
                    '<p>a<del data-operation-index="1"> b</del></p>' + '<p data-diff-node="del" data-operation-index="3">' + '<del data-operation-index="3">c</del></p>',
                );
            });

            it("should not identify partial tags", () => {
                res = cut(tokenize(["test", "</b>", "non-bold"]), tokenize(["test!", "</b>", "non-bold", "<b>", "bold"]));

                expect(res).to.equal(
                    '<del data-operation-index="0">test</del>' + '<ins data-operation-index="0">test!</ins></b>non-bold<b>' + '<ins data-operation-index="2">bold</ins>',
                );
            });

            describe("When there is a change at the beginning, in a <p>", () => {
                beforeEach(() => {
                    res = cut(tokenize(["<p>", "this", " ", "is", " ", "awesome", "</p>"]), tokenize(["<p>", "I", " ", "is", " ", "awesome", "</p>"]));
                });

                it("should keep the change inside the <p>", () => {
                    expect(res).to.equal('<p><del data-operation-index="1">this</del>' + '<ins data-operation-index="1">I</ins> is awesome</p>');
                });
            });
        });

        describe("empty tokens", () => {
            it("should not be wrapped", () => {
                res = cut(tokenize(["text"]), tokenize(["text", " "]));

                expect(res).to.equal("text");
            });
        });

        describe("tags with attributes", () => {
            it("should treat attribute changes as equal and output the after tag", () => {
                res = cut(
                    tokenize(["<p>", "this", " ", "is", " ", "awesome", "</p>"]),
                    tokenize(['<p style="margin: 2px;" class="after">', "this", " ", "is", " ", "awesome", "</p>"]),
                );

                expect(res).to.equal('<p style="margin: 2px;" class="after">this is awesome</p>');
            });

            it("should show changes within tags with different attributes", () => {
                res = cut(
                    tokenize(["<p>", "this", " ", "is", " ", "awesome", "</p>"]),
                    tokenize(['<p style="margin: 2px;" class="after">', "that", " ", "is", " ", "awesome", "</p>"]),
                );

                expect(res).to.equal(
                    '<p style="margin: 2px;" class="after">' + '<del data-operation-index="1">this</del><ins data-operation-index="1">' + "that</ins> is awesome</p>",
                );
            });
        });

        describe("wrappable tags", () => {
            it("should wrap void tags", () => {
                res = cut(tokenize(["old", " ", "text"]), tokenize(["new", "<br/>", " ", "text"]));

                expect(res).to.equal('<del data-operation-index="0">old</del>' + '<ins data-operation-index="0">new<br/></ins> text');
            });

            it("should wrap atomic tags independently", () => {
                res = cut(tokenize(["old", '<iframe src="source.html"></iframe>', " ", "text"]), tokenize(["new", " ", "text"]));

                expect(res).to.equal(
                    '<del data-operation-index="0">old</del>' +
                        '<del data-operation-index="0"><iframe src="source.html"></iframe></del>' +
                        '<ins data-operation-index="0">new</ins> text',
                );
            });
        });
    });
});
