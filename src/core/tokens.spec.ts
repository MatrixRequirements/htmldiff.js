import { expect } from "chai";
import { createToken, isTag, isVoidTag, isVoidTagName, isWrappable } from "./tokens";

describe("tokens", () => {
    describe("isTag", () => {
        it("names a tag token and rejects text", () => {
            expect(isTag('<p class="a">')).to.equal("p");
            expect(isTag("</p>")).to.equal("/p");
            expect(isTag("text")).to.equal(false);
        });
    });

    describe("void tags", () => {
        it("recognises self-closing tags and void tag names", () => {
            expect(isVoidTag("<br/>")).to.equal(true);
            expect(isVoidTag("<br>")).to.equal(false);
            expect(isVoidTagName("img")).to.equal(true);
            expect(isVoidTagName("div")).to.equal(false);
        });
    });

    describe("isWrappable", () => {
        it("wraps text, images, void and atomic tags, not other tags", () => {
            expect(isWrappable("word")).to.equal(true);
            expect(isWrappable('<img src="x">')).to.equal(true);
            expect(isWrappable("<br/>")).to.equal(true);
            expect(isWrappable("<svg></svg>")).to.equal(true);
            expect(isWrappable("<p>")).to.equal(false);
        });
    });

    describe("createToken", () => {
        it("holds the string and its key", () => {
            expect(createToken('<P class="x">')).to.deep.equal({ string: '<P class="x">', key: "<p>" });
        });
    });
});
