import { expect } from "chai";
import { diffCore, renderOperations } from "./diff";
import { htmlToTokens } from "./tokens";

describe("diff", () => {
    describe("diffCore", () => {
        it("returns the before html untouched when nothing changed", () => {
            expect(diffCore("<p>same</p>", "<p>same</p>")).to.equal("<p>same</p>");
        });

        it("wraps a changed word", () => {
            expect(diffCore("<p>a b</p>", "<p>a c</p>")).to.equal('<p>a <del data-operation-index="1">b</del><ins data-operation-index="1">c</ins></p>');
        });

        it("passes class and prefix through", () => {
            expect(diffCore("a", "b", "cls", "pre")).to.equal(
                '<del data-pre-operation-index="0" class="cls">a</del><ins data-pre-operation-index="0" class="cls">b</ins>',
            );
        });
    });

    describe("renderOperations", () => {
        it("renders operations over tokens", () => {
            const before = htmlToTokens("a");
            const after = htmlToTokens("b");
            expect(renderOperations(before, after, [{ action: "replace", startInBefore: 0, endInBefore: 0, startInAfter: 0, endInAfter: 0 }])).to.equal(
                '<del data-operation-index="0">a</del><ins data-operation-index="0">b</ins>',
            );
        });
    });
});
