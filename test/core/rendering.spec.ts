import { expect } from "chai";
import { findOpeningTagEnd, isInnerDiffToken, renderInnerDiff, splitAtomicTokenString, wrap } from "../../src/core/rendering";

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
});
