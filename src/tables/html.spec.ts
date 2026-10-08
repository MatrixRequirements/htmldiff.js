import { expect } from "chai";
import {
    addTagClass,
    decodeEntities,
    findElements,
    getTagAttribute,
    removeTagAttribute,
    replaceRanges,
    scanTags,
    setTagAttribute,
    Tag,
} from "./html";

describe("html", () => {
    describe("scanTags", () => {
        it("reports every tag with its name, kind and position", () => {
            const tags: [string, boolean, boolean, boolean, number][] = [];
            scanTags('<p class="a">x<br/></p><!-- c -->', (tag: Tag) => {
                tags.push([tag.name, tag.isClosing, tag.isSelfClosing, tag.isComment, tag.start]);
            });
            expect(tags).to.deep.equal([
                ["p", false, false, false, 0],
                ["br", false, true, false, 14],
                ["p", true, false, false, 19],
                ["", false, true, true, 23],
            ]);
        });

        it("does not end a tag at a > inside an attribute value", () => {
            const texts: string[] = [];
            scanTags('<a title="x > y">t</a>', (tag) => {
                texts.push(tag.text);
            });
            expect(texts).to.deep.equal(['<a title="x > y">', "</a>"]);
        });
    });

    describe("findElements", () => {
        it("finds elements with their tags, content and positions", () => {
            expect(findElements("<p>a</p><div>b</div>", ["div"])).to.deep.equal([
                { name: "div", start: 8, openTag: "<div>", innerStart: 13, inner: "b", closeTag: "</div>", end: 20 },
            ]);
        });

        it("skips elements inside a nested table", () => {
            const elements = findElements("<tr><td><table><tr><td>in</td></tr></table></td></tr>", ["td"]);
            expect(elements.length).to.equal(1);
            expect(elements[0].inner).to.equal("<table><tr><td>in</td></tr></table>");
        });
    });

    describe("tag attributes", () => {
        it("reads quoted, unquoted and bare attributes", () => {
            expect(getTagAttribute('<td colspan="2" rowspan=3 hidden>', "colspan")).to.equal("2");
            expect(getTagAttribute('<td colspan="2" rowspan=3 hidden>', "rowspan")).to.equal("3");
            expect(getTagAttribute('<td colspan="2" rowspan=3 hidden>', "hidden")).to.equal("");
            expect(getTagAttribute('<td colspan="2">', "class")).to.equal(null);
        });

        it("does not confuse an attribute with a longer name", () => {
            expect(getTagAttribute('<td data-x-id="1">', "id")).to.equal(null);
        });

        it("sets a new attribute last and changes an existing one in place", () => {
            expect(setTagAttribute('<td a="1">', "b", 2)).to.equal('<td a="1" b="2">');
            expect(setTagAttribute('<td a="1" b="2">', "a", "x")).to.equal('<td a="x" b="2">');
            expect(setTagAttribute('<col style="w" />', "class", "c")).to.equal('<col style="w" class="c" />');
        });

        it("removes an attribute", () => {
            expect(removeTagAttribute('<td a="1" b="2">', "a")).to.equal('<td b="2">');
            expect(removeTagAttribute("<td>", "a")).to.equal("<td>");
        });

        it("adds a class like classList.add", () => {
            expect(addTagClass("<tr>", "x")).to.equal('<tr class="x">');
            expect(addTagClass('<tr class="a">', "x")).to.equal('<tr class="a x">');
            expect(addTagClass('<tr class="a x">', "x")).to.equal('<tr class="a x">');
        });
    });

    describe("decodeEntities", () => {
        it("decodes named and numeric entities", () => {
            expect(decodeEntities("a &amp; b &lt; &#65;&#x42; &nbsp;")).to.equal("a & b < AB  ");
        });

        it("leaves unknown entities as they are", () => {
            expect(decodeEntities("&foo;")).to.equal("&foo;");
        });
    });

    describe("replaceRanges", () => {
        it("applies replacements whatever their order", () => {
            expect(
                replaceRanges("0123456789", [
                    { start: 7, end: 9, html: "X" },
                    { start: 1, end: 3, html: "YY" },
                ]),
            ).to.equal("0YY3456X9");
        });
    });
});
