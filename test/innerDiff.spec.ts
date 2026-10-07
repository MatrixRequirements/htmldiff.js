import { expect } from "chai";
import diff from "../src/htmldiff";

describe("Recursive inner diff (data-htmldiff-inner-diff)", () => {
    const cut = diff;

    function tocEntry(href: string, name: string): string {
        return `<div class="toc-entry" data-htmldiff-id="123" data-htmldiff-inner-diff="true"><a href="${href}">${name}</a></div>`;
    }

    describe("when an opted-in element is renamed in place", () => {
        it("renders inline ins/del inside the single emitted element", () => {
            const res = cut(tocEntry("#123", "1. Old name"), tocEntry("#123", "1. New name"));
            expect(res).to.equal(
                '<div class="toc-entry" data-htmldiff-id="123" data-htmldiff-inner-diff="true">' +
                    '<a href="#123">1. <del data-operation-index="1">Old</del>' +
                    '<ins data-operation-index="1">New</ins> name</a></div>',
            );
        });

        it("passes className and dataPrefix through to the inner ins/del tags", () => {
            const res = cut(tocEntry("#123", "Old"), tocEntry("#123", "New"), "diff-cls", "pre");
            expect(res).to.equal(
                '<div class="toc-entry" data-htmldiff-id="123" data-htmldiff-inner-diff="true">' +
                    '<a href="#123"><del data-pre-operation-index="1" class="diff-cls">Old</del>' +
                    '<ins data-pre-operation-index="1" class="diff-cls">New</ins></a></div>',
            );
        });

        it("keeps diffing the rest of the document with the outer atomic tag list", () => {
            // The <a> outside the opted-in element must stay atomic after the inner diff ran.
            const res = cut(tocEntry("#123", "Old name") + '<a href="x.html">same link</a>', tocEntry("#123", "New name") + '<a href="y.html">same link</a>');
            expect(res).to.equal(
                '<div class="toc-entry" data-htmldiff-id="123" data-htmldiff-inner-diff="true">' +
                    '<a href="#123"><del data-operation-index="1">Old</del>' +
                    '<ins data-operation-index="1">New</ins> name</a></div>' +
                    '<del data-operation-index="1"><a href="x.html">same link</a></del>' +
                    '<ins data-operation-index="1"><a href="y.html">same link</a></ins>',
            );
        });
    });

    describe("anchors inside the recursive diff", () => {
        it("do not treat <a> as atomic, so href-only changes produce no diff markup", () => {
            const res = cut(tocEntry("#18036", "1. Same name"), tocEntry("#18037", "1. Same name"));
            expect(res).to.equal(tocEntry("#18037", "1. Same name"));
        });

        it("diffs the link text inline when the href changed", () => {
            const res = cut(tocEntry("#18036", "1. Old name"), tocEntry("#18037", "1. New name"));
            expect(res).to.equal(
                '<div class="toc-entry" data-htmldiff-id="123" data-htmldiff-inner-diff="true">' +
                    '<a href="#18037">1. <del data-operation-index="1">Old</del>' +
                    '<ins data-operation-index="1">New</ins> name</a></div>',
            );
        });
    });

    describe("atomic tags inside the recursive diff", () => {
        function el(extraAttrs: string, inner: string): string {
            return `<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"${extraAttrs}>${inner}</div>`;
        }

        it("keeps the default atomic tags (without a) inside the recursion", () => {
            // Embedded content like svg stays atomic by default: a changed svg is replaced
            // as a whole, not word-diffed.
            const res = cut(el("", '<svg viewBox="0 0 1 1"><text>old</text></svg>'), el("", '<svg viewBox="0 0 1 1"><text>new</text></svg>'));
            expect(res).to.equal(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true">' +
                    '<del data-operation-index="0">' +
                    '<svg viewBox="0 0 1 1"><text>old</text></svg></del>' +
                    '<ins data-operation-index="0">' +
                    '<svg viewBox="0 0 1 1"><text>new</text></svg></ins>' +
                    "</div>",
            );
        });

        it("replaces the default list with data-htmldiff-inner-diff-atomic-tags", () => {
            // The override lists only em, so svg is no longer atomic and gets word-diffed.
            const attrs = ' data-htmldiff-inner-diff-atomic-tags="em"';
            const res = cut(el(attrs, '<svg viewBox="0 0 1 1"><text>old</text></svg>'), el(attrs, '<svg viewBox="0 0 1 1"><text>new</text></svg>'));
            expect(res).to.equal(
                `<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"${attrs}>` +
                    '<svg viewBox="0 0 1 1"><text>' +
                    '<del data-operation-index="1">old</del>' +
                    '<ins data-operation-index="1">new</ins>' +
                    "</text></svg></div>",
            );
        });

        it("restores atomic anchors (href comparison) when the override lists a", () => {
            const attrs = ' data-htmldiff-inner-diff-atomic-tags="a"';
            const res = cut(el(attrs, '<a href="#1">Name</a>'), el(attrs, '<a href="#2">Name</a>'));
            expect(res).to.equal(
                `<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"${attrs}>` +
                    '<del data-operation-index="0"><a href="#1">Name</a></del>' +
                    '<ins data-operation-index="0"><a href="#2">Name</a></ins>' +
                    "</div>",
            );
        });

        it("treats no tag name as atomic when the override value is empty", () => {
            const attrs = ' data-htmldiff-inner-diff-atomic-tags=""';
            const res = cut(el(attrs, '<svg viewBox="0 0 1 1"><text>old</text></svg>'), el(attrs, '<svg viewBox="0 0 1 1"><text>new</text></svg>'));
            expect(res).to.equal(
                `<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"${attrs}>` +
                    '<svg viewBox="0 0 1 1"><text>' +
                    '<del data-operation-index="1">old</del>' +
                    '<ins data-operation-index="1">new</ins>' +
                    "</text></svg></div>",
            );
        });
    });

    describe("opt-in attribute values", () => {
        function entry(value: string, name: string): string {
            return `<div data-htmldiff-id="123" data-htmldiff-inner-diff=${value}>${name}</div>`;
        }

        it('treats a double-quoted "false" value as opted out', () => {
            const res = cut(entry('"false"', "old"), entry('"false"', "new"));
            expect(res).to.equal(entry('"false"', "new"));
        });

        it("treats a single-quoted 'false' value as opted out", () => {
            const res = cut(entry("'false'", "old"), entry("'false'", "new"));
            expect(res).to.equal(entry("'false'", "new"));
        });

        it("treats an unquoted false value as opted out", () => {
            const res = cut(entry("false", "old"), entry("false", "new"));
            expect(res).to.equal(entry("false", "new"));
        });

        it("treats a bare attribute without a value as opted in", () => {
            const res = cut('<div data-htmldiff-id="123" data-htmldiff-inner-diff>old</div>', '<div data-htmldiff-id="123" data-htmldiff-inner-diff>new</div>');
            expect(res).to.equal(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff>' + '<del data-operation-index="0">old</del>' + '<ins data-operation-index="0">new</ins></div>',
            );
        });

        it("only matches exact attribute name", () => {
            const res = cut(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff-extra="true">old</div>',
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff-extra="true">new</div>',
            );
            expect(res).to.equal('<div data-htmldiff-id="123" data-htmldiff-inner-diff-extra="true">new</div>');
        });

        it("recognizes the attribute regardless of its position", () => {
            const res = cut(
                '<div data-htmldiff-inner-diff="true" data-htmldiff-id="123">old</div>',
                '<div data-htmldiff-inner-diff="true" data-htmldiff-id="123">new</div>',
            );
            expect(res).to.equal(
                '<div data-htmldiff-inner-diff="true" data-htmldiff-id="123">' +
                    '<del data-operation-index="0">old</del>' +
                    '<ins data-operation-index="0">new</ins></div>',
            );
        });
    });

    describe("edge cases", () => {
        it("ignores the attribute on non-atomic elements (no data-htmldiff-id)", () => {
            // Without data-htmldiff-id the div is not atomic, so this is a plain word diff.
            const res = cut('<div data-htmldiff-inner-diff="true">old text</div>', '<div data-htmldiff-inner-diff="true">new text</div>');
            expect(res).to.equal(
                '<div data-htmldiff-inner-diff="true">' + '<del data-operation-index="1">old</del>' + '<ins data-operation-index="1">new</ins> text</div>',
            );
        });

        it("diffs text following a self-closing opted-in element normally", () => {
            const res = cut(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"/>x old',
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"/>x new',
            );
            expect(res).to.equal(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"/>x ' +
                    '<del data-operation-index="1">old</del>' +
                    '<ins data-operation-index="1">new</ins>',
            );
        });

        it("marks the content as inserted when the before element was self-closing", () => {
            // A self-closing element has empty inner content, so the new content is a
            // pure insertion.
            const res = cut('<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"/>', '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true">new</div>');
            expect(res).to.equal('<div data-htmldiff-id="123" data-htmldiff-inner-diff="true">' + '<ins data-operation-index="0">new</ins></div>');
        });

        it("marks the content as deleted when the after element became self-closing", () => {
            // The after element has no content anymore, so the deleted content is
            // rendered right after the self-closing tag.
            const res = cut('<div data-htmldiff-id="123" data-htmldiff-inner-diff="true">old</div>', '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"/>');
            expect(res).to.equal('<div data-htmldiff-id="123" data-htmldiff-inner-diff="true"/>' + '<del data-operation-index="0">old</del>');
        });

        it('is not confused by ">" inside attribute values', () => {
            const res = cut(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true" title="a > b">old</div>',
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true" title="a > c">new</div>',
            );
            expect(res).to.equal(
                '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true" title="a > c">' +
                    '<del data-operation-index="0">old</del>' +
                    '<ins data-operation-index="0">new</ins></div>',
            );
        });

        it('is not confused by ">" inside single-quoted attribute values', () => {
            const res = cut(
                "<div data-htmldiff-id='123' data-htmldiff-inner-diff title='a > b'>old</div>",
                "<div data-htmldiff-id='123' data-htmldiff-inner-diff title='a > b'>new</div>",
            );
            expect(res).to.equal(
                "<div data-htmldiff-id='123' data-htmldiff-inner-diff title='a > b'>" +
                    '<del data-operation-index="0">old</del>' +
                    '<ins data-operation-index="0">new</ins></div>',
            );
        });

        it("falls back to the after version when a token cannot be split", () => {
            // An unterminated atomic tag swallows the rest of the input and has no closing
            // tag to split on; the inner diff falls back instead of producing broken markup.
            const after = '<div data-htmldiff-id="123" data-htmldiff-inner-diff="true">new';
            const res = cut('<div data-htmldiff-id="123" data-htmldiff-inner-diff="true">old', after);
            expect(res).to.equal(after);
        });

        it("renders pure insertions when the before content is empty", () => {
            const res = cut(tocEntry("#1", ""), tocEntry("#1", "New name"));
            expect(res).to.equal(
                '<div class="toc-entry" data-htmldiff-id="123" data-htmldiff-inner-diff="true">' +
                    '<a href="#1"><ins data-operation-index="1">New name</ins></a></div>',
            );
        });

        it("do not diffs inner html for moved opted-in elements", () => {
            function entry(id: string, name: string): string {
                return `<div data-htmldiff-id="${id}" data-htmldiff-inner-diff="true">${name}</div>`;
            }
            const res = cut(entry("a", "First") + entry("b", "Second"), entry("b", "Second") + entry("a", "First"));
            expect(res).to.equal(
                `<ins data-operation-index="0">${entry("b", "Second")}</ins>` + entry("a", "First") + `<del data-operation-index="2">${entry("b", "Second")}</del>`,
            );
        });
    });

    describe("when the element did not opt in", () => {
        it("should render the after version as is when keys match but content differs", () => {
            const before = '<div data-htmldiff-id="chart-1"><svg viewBox="0 0 1 1"><rect width="5"/></svg></div>';
            const after = '<div data-htmldiff-id="chart-1"><svg viewBox="0 0 2 2"><rect width="9"/></svg></div>';
            expect(cut(before, after)).to.equal(after);
        });
    });

    describe("when key and content are both equal", () => {
        it("should render the element unchanged", () => {
            const before = `x ${tocEntry("#123", "1. Same name")} y`;
            const after = `x ${tocEntry("#123", "1. Same name")} z`;
            expect(cut(before, after)).to.equal(`x ${tocEntry("#123", "1. Same name")} ` + '<del data-operation-index="1">y</del><ins data-operation-index="1">z</ins>');
        });
    });

    describe("when opted-in elements are nested", () => {
        function nest(depth: number, content: string): string {
            let html = content;
            for (let i = depth; i >= 1; i--) {
                html = `<div data-htmldiff-id="d${i}" data-htmldiff-inner-diff="true">${html}</div>`;
            }
            return html;
        }

        it("diffs nested elements", () => {
            const res = cut(
                '<div data-htmldiff-id="outer" data-htmldiff-inner-diff="true">x ' + '<span data-htmldiff-id="inner" data-htmldiff-inner-diff="true">old</span></div>',
                '<div data-htmldiff-id="outer" data-htmldiff-inner-diff="true">x ' + '<span data-htmldiff-id="inner" data-htmldiff-inner-diff="true">new</span></div>',
            );
            expect(res).to.equal(
                '<div data-htmldiff-id="outer" data-htmldiff-inner-diff="true">x ' +
                    '<span data-htmldiff-id="inner" data-htmldiff-inner-diff="true">' +
                    '<del data-operation-index="0">old</del>' +
                    '<ins data-operation-index="0">new</ins></span></div>',
            );
        });

        it("do not diffs nested element that do not opt-in", () => {
            const after = '<div data-htmldiff-id="outer" data-htmldiff-inner-diff="true">t ' + '<span data-htmldiff-id="inner">new</span></div>';
            const res = cut('<div data-htmldiff-id="outer" data-htmldiff-inner-diff="true">t ' + '<span data-htmldiff-id="inner">old</span></div>', after);
            expect(res).to.equal(after);
        });

        it("diffs all levels up to the depth cap of 10", () => {
            const res = cut(nest(10, "old"), nest(10, "new"));
            expect(res).to.equal(nest(10, '<del data-operation-index="0">old</del>' + '<ins data-operation-index="0">new</ins>'));
        });

        it("renders the after version as is beyond the depth cap", () => {
            const res = cut(nest(11, "old"), nest(11, "new"));
            expect(res).to.equal(nest(11, "new"));
        });
    });
});
