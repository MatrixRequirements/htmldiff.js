import { expect } from "chai";
import htmldiff from "../src/htmldiff";

describe("The specs from the ruby source project", () => {
    const cut = htmldiff;

    it("should diff text", () => {
        const diff = cut("a word is here", "a nother word is there");
        expect(diff).equal('a<ins data-operation-index="1"> nother</ins> word is ' + '<del data-operation-index="3">here</del><ins data-operation-index="3">' + "there</ins>");
    });

    it("should insert a letter and a space", () => {
        const diff = cut("a c", "a b c");
        expect(diff).equal('a <ins data-operation-index="1">b </ins>c');
    });

    it("should remove a letter and a space", () => {
        const diff = cut("a b c", "a c");
        expect(diff).equal('a <del data-operation-index="1">b </del>c');
    });

    it("should change a letter", () => {
        const diff = cut("a b c", "a d c");
        expect(diff).equal('a <del data-operation-index="1">b</del>' + '<ins data-operation-index="1">d</ins> c');
    });
});
