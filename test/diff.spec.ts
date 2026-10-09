import { expect } from "chai";
import diff from "../src/htmldiff";

describe("Diff", () => {
    const cut = diff;
    let res: string;

    describe("When both inputs are the same", () => {
        beforeEach(() => {
            res = cut("input text", "input text");
        });

        it("should return the text", () => {
            expect(res).equal("input text");
        });

        it("should return the input as it is, tables included", () => {
            const html = "<p>t</p><table><tbody><tr>\n<td>a</td> <td>b</td>\n</tr></tbody></table>";
            expect(cut(html, html)).to.equal(html);
        });
    });

    describe("When a letter is added", () => {
        beforeEach(() => {
            res = cut("input", "input 2");
        });

        it("should mark the new letter", () => {
            expect(res).to.equal('input<ins data-operation-index="1"> 2</ins>');
        });
    });

    describe("Whitespace differences", () => {
        it("should collapse adjacent whitespace", () => {
            expect(cut("Much \t    spaces", "Much spaces")).to.equal("Much spaces");
        });

        it("should consider non-breaking spaces as equal", () => {
            expect(cut("Hello&nbsp;world", "Hello&#160;world")).to.equal("Hello&#160;world");
        });

        it("should consider non-breaking spaces and non-adjacent regular spaces as equal", () => {
            expect(cut("Hello&nbsp;world", "Hello world")).to.equal("Hello world");
        });
    });

    describe("When a class name is specified", () => {
        it("should include the class in the wrapper tags", () => {
            expect(cut("input", "input 2", "diff-result")).to.equal('input<ins data-operation-index="1" class="diff-result"> 2</ins>');
        });
    });

    describe("Adjacent atomic tag combining", () => {
        it("should wrap each inserted atomic tag independently when multiple are inserted", () => {
            expect(cut("", '<iframe src="a.html"></iframe><iframe src="b.html"></iframe>')).to.equal(
                '<ins data-operation-index="0"><iframe src="a.html"></iframe></ins>' + '<ins data-operation-index="0"><iframe src="b.html"></iframe></ins>',
            );
        });

        it("should wrap each deleted atomic tag independently when multiple are deleted", () => {
            expect(cut('<iframe src="a.html"></iframe><iframe src="b.html"></iframe>', "")).to.equal(
                '<del data-operation-index="0"><iframe src="a.html"></iframe></del>' + '<del data-operation-index="0"><iframe src="b.html"></iframe></del>',
            );
        });

        it("should not merge atomic tag with adjacent text in same ins/del", () => {
            expect(cut("hello world", 'hello<iframe src="a.html"></iframe>world')).to.equal(
                'hello<ins data-operation-index="1"><iframe src="a.html"></iframe></ins>world',
            );
        });

        it("should wrap inserted <b> content inside the tag, not in a standalone ins", () => {
            expect(cut("", "<b>hello</b>")).to.equal('<b data-diff-node="ins" data-operation-index="0"><ins data-operation-index="0">hello</ins></b>');
        });

        it("should mark non-atomic container tags with data-diff-node rather than wrapping with ins", () => {
            expect(cut("", "<li><div>content</div></li>")).to.equal(
                '<li data-diff-node="ins" data-operation-index="0">' +
                    '<div data-diff-node="ins" data-operation-index="0">' +
                    '<ins data-operation-index="0">content</ins>' +
                    "</div>" +
                    "</li>",
            );
        });

        it("should keep adjacent inserted <b> tags as separate segments", () => {
            expect(cut("", "<b>hello</b><b>world</b>")).to.equal(
                '<b data-diff-node="ins" data-operation-index="0"><ins data-operation-index="0">hello</ins></b>' +
                    '<b data-diff-node="ins" data-operation-index="0"><ins data-operation-index="0">world</ins></b>',
            );
        });
    });

    describe("Atomic tag list override (atomicTags parameter)", () => {
        // Regression tests for the parameter regexp being built with a literal backspace
        // ('\b' instead of '\\b'), which made every override match nothing.
        it("treats a listed tag as atomic", () => {
            expect(cut('<iframe src="a.html"></iframe>', '<iframe src="b.html"></iframe>', null, null, "iframe")).to.equal(
                '<del data-operation-index="0"><iframe src="a.html"></iframe></del>' + '<ins data-operation-index="0"><iframe src="b.html"></iframe></ins>',
            );
        });

        it("replaces the default list, so an unlisted default tag loses atomicity", () => {
            expect(cut('<iframe src="a.html">x</iframe>', '<iframe src="a.html">y</iframe>', null, null, "p")).to.equal(
                '<iframe src="a.html">' + '<del data-operation-index="1">x</del>' + '<ins data-operation-index="1">y</ins></iframe>',
            );
        });

        it("does not match tags that merely start with a listed name", () => {
            // 'if' must not make <iframe> atomic: tag names are matched completely.
            expect(cut('<iframe src="a.html">x</iframe>', '<iframe src="a.html">y</iframe>', null, null, "if")).to.equal(
                '<iframe src="a.html">' + '<del data-operation-index="1">x</del>' + '<ins data-operation-index="1">y</ins></iframe>',
            );
        });
    });

    describe("Tags sharing a prefix with atomic tag names", () => {
        it("should diff <abbr> content although a is an atomic tag", () => {
            expect(cut("<abbr>old</abbr> t", "<abbr>new</abbr> t")).to.equal(
                '<abbr><del data-operation-index="1">old</del>' + '<ins data-operation-index="1">new</ins></abbr> t',
            );
        });
    });

    describe('Quoted attribute values containing ">"', () => {
        it('should diff the content of a tag with ">" in an attribute value', () => {
            expect(cut('<p title="a>b">old</p>', '<p title="a>b">new</p>')).to.equal(
                '<p title="a>b">' + '<del data-operation-index="1">old</del>' + '<ins data-operation-index="1">new</ins></p>',
            );
        });
    });

    describe("Void atomic elements", () => {
        it("should diff text following a void data-htmldiff-id element", () => {
            expect(cut('<img data-htmldiff-id="1" src="a.jpg"> old', '<img data-htmldiff-id="1" src="a.jpg"> new')).to.equal(
                '<img data-htmldiff-id="1" src="a.jpg"> ' + '<del data-operation-index="1">old</del>' + '<ins data-operation-index="1">new</ins>',
            );
        });
    });
});
