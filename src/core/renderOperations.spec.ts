import { expect } from "chai";
import { renderOperations } from "./diff";
import { calculateOperations } from "./operations";
import { createToken, Token } from "./tokens";

describe("renderOperations", () => {
    const tokenize = (tokens: string[]): Token[] => tokens.map((token) => createToken(token));
    const cut = (before: Token[], after: Token[]): string => renderOperations(before, after, calculateOperations(before, after));
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
