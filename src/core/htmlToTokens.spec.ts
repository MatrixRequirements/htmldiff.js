import { expect } from "chai";
import { createToken, htmlToTokens, Token } from "./tokens";

describe("htmlToTokens", () => {
    const cut = htmlToTokens;
    const tokenize = (tokens: string[]): Token[] => tokens.map((token) => createToken(token));
    let res: Token[];

    it("should be a function", () => {
        expect(cut).is.a("function");
    });

    describe("when called with text", () => {
        beforeEach(() => {
            res = cut("this is a test");
        });

        it("should return 4", () => {
            expect(res.length).to.equal(7);
        });
    });

    describe("when called with html", () => {
        beforeEach(() => {
            res = cut("<p>this is a <strong>test</strong></p>");
        });

        it("should return 11", () => {
            expect(res.length).to.equal(11);
        });

        it("should remove any html comments", () => {
            res = cut("<p> this is <!-- a comment! --> </p>");
            expect(res.length).to.equal(8);
        });
    });

    it("should identify contiguous whitespace as a single token", () => {
        expect(cut("a   b")).to.eql(tokenize(["a", "   ", "b"]));
    });

    it("should identify a single space as a single token", () => {
        expect(cut(" a b ")).to.eql(tokenize([" ", "a", " ", "b", " "]));
    });

    it("should identify self closing tags as tokens", () => {
        expect(cut("<p>hello</br>goodbye</p>")).eql(tokenize(["<p>", "hello", "</br>", "goodbye", "</p>"]));
    });

    describe("when encountering atomic tags", () => {
        it("should identify an image tag as a single token", () => {
            expect(cut('<p><img src="1.jpg"><img src="2.jpg"></p>')).eql(tokenize(["<p>", '<img src="1.jpg">', '<img src="2.jpg">', "</p>"]));
        });

        it("should identify an iframe tag as a single token", () => {
            expect(cut('<p><iframe src="sample.html"></iframe></p>')).eql(tokenize(["<p>", '<iframe src="sample.html"></iframe>', "</p>"]));
        });

        it("should identify an object tag as a single token", () => {
            expect(cut('<p><object><param name="1" /><param name="2" /></object></p>')).eql(
                tokenize(["<p>", '<object><param name="1" /><param name="2" /></object>', "</p>"]),
            );
        });

        it("should identify a math tag as a single token", () => {
            const math =
                '<math xmlns="http://www.w3.org/1998/Math/MathML">' +
                "<mi>&#x03C0;<!-- π --></mi>" +
                "<mo>&#x2062;<!-- &InvisibleTimes; --></mo>" +
                "<msup><mi>r</mi><mn>2</mn></msup></math>";
            expect(cut(`<p>${math}</p>`)).eql(tokenize(["<p>", math, "</p>"]));
        });

        it("should identify an svg tag as a single token", () => {
            const svg = '<svg width="100" height="100">' + '<circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />' + "</svg>";
            expect(cut(`<p>${svg}</p>`)).eql(tokenize(["<p>", svg, "</p>"]));
        });

        it("should identify a script tag as a single token", () => {
            expect(cut('<p><script>console.log("hi");</script></p>')).eql(tokenize(["<p>", '<script>console.log("hi");</script>', "</p>"]));
        });

        it("should identify tags with data-htmldiff-id attribute as single token", () => {
            expect(
                cut('<div><customtag data-htmldiff-id="1">hello</br>goodbye</customtag>' + '<custom-tag data-htmldiff-id="2">some stuff</custom-tag>' + "</div>"),
            ).eql(
                tokenize([
                    "<div>",
                    '<customtag data-htmldiff-id="1">hello</br>goodbye</customtag>',
                    '<custom-tag data-htmldiff-id="2">some stuff</custom-tag>',
                    "</div>",
                ]),
            );
        });

        describe("nested atomic tags wrapping", () => {
            it("should keep a data-htmldiff-id wrapper with nested same-tag children as one token", () => {
                const atomic = '<span data-htmldiff-id="u1">' + '<span class="tooltip"><span class="avatar">AB</span></span>' + "Name</span>";
                expect(cut(`<div>${atomic}</div>`)).eql(tokenize(["<div>", atomic, "</div>"]));
            });

            it("should not close early on the first inner closing tag", () => {
                const atomic = '<span data-htmldiff-id="1"><span>a</span><span>b</span></span>';
                expect(cut(atomic)).eql(tokenize([atomic]));
            });

            it('should not treat a stray ">" in script content as a tag boundary', () => {
                const atomic = "<script>if (a > b) { return a > 0; }</script>";
                expect(cut(`<p>${atomic}</p>`)).eql(tokenize(["<p>", atomic, "</p>"]));
            });

            it("should ignore self-closing same-named children when counting depth", () => {
                const atomic = '<span data-htmldiff-id="1">x<span/>y</span>';
                expect(cut(atomic)).eql(tokenize([atomic]));
            });

            it("should ignore self-closing same-named children written with a space (<span />)", () => {
                const atomic = '<span data-htmldiff-id="1">x<span />y</span>';
                expect(cut(atomic)).eql(tokenize([atomic]));
            });

            it("should key a wrapper by its own data-htmldiff-id, not a nested child one", () => {
                const atomic = '<strong data-htmldiff-id="s1">' + '<em data-htmldiff-id="e1">C</em></strong>';
                expect(cut(atomic)[0].key).eql("s1");
            });

            it("should not key an unkeyed atomic tag by a nested child data-htmldiff-id", () => {
                const atomic = '<a><em data-htmldiff-id="e1">C</em></a>';
                expect(cut(atomic)[0].key).eql("<a>");
            });

            it("should not bump depth on differently-named tags that share a prefix", () => {
                // a tag must not be matched by an atomic tag named "a" appearing as <article>.
                const atomic = '<a href="x"><article>hi</article></a>';
                expect(cut(atomic)).eql(tokenize([atomic]));
            });
        });

        describe("tags sharing a prefix with atomic tag names", () => {
            it("should not treat <abbr> as the atomic tag a", () => {
                expect(cut("<abbr>x</abbr> tail")).eql(tokenize(["<abbr>", "x", "</abbr>", " ", "tail"]));
            });

            it("should not treat <article> as the atomic tag a", () => {
                expect(cut("<article>hi</article>")).eql(tokenize(["<article>", "hi", "</article>"]));
            });
        });

        describe("self-closing atomic tags", () => {
            it("should end a self-closing data-htmldiff-id tag without swallowing trailing content", () => {
                expect(cut('<div data-htmldiff-id="s"/>x old')).eql(tokenize(['<div data-htmldiff-id="s"/>', "x", " ", "old"]));
            });

            it("should end a self-closing name-based atomic tag without swallowing trailing content", () => {
                expect(cut("<svg/>tail")).eql(tokenize(["<svg/>", "tail"]));
            });
        });

        describe("quoted attribute values containing tag delimiters", () => {
            it('should not end a tag on ">" inside a double-quoted attribute value', () => {
                expect(cut('<p class="a>b">text</p>')).eql(tokenize(['<p class="a>b">', "text", "</p>"]));
            });

            it('should not end a tag on ">" inside a single-quoted attribute value', () => {
                expect(cut("<p class='a>b'>x</p>")).eql(tokenize(["<p class='a>b'>", "x", "</p>"]));
            });

            it('should not end a void atomic tag on ">" inside an attribute value', () => {
                expect(cut('<img data-htmldiff-id="1" alt="a > b"> tail')).eql(tokenize(['<img data-htmldiff-id="1" alt="a > b">', " ", "tail"]));
            });

            it('should not treat "/>" inside an attribute value as self-closing', () => {
                const atomic = '<span data-htmldiff-id="1" data-x="y/>z">c</span>';
                expect(cut(atomic)).eql(tokenize([atomic]));
            });

            it('should keep an atomic tag with ">" in an attribute as one token', () => {
                expect(cut('<div data-htmldiff-id="1" title="a > b">x</div> tail')).eql(
                    tokenize(['<div data-htmldiff-id="1" title="a > b">x</div>', " ", "tail"]),
                );
            });

            it("should not treat apostrophes in atomic text content as quotes", () => {
                expect(cut("<div data-htmldiff-id='1'>it's ok</div> tail")).eql(tokenize(["<div data-htmldiff-id='1'>it's ok</div>", " ", "tail"]));
            });

            it("should not treat apostrophes in comments inside atomic tags as quotes", () => {
                expect(cut("<math><mi>x<!-- don't --></mi></math> tail")).eql(tokenize(["<math><mi>x<!-- don't --></mi></math>", " ", "tail"]));
            });
        });

        describe("void atomic tags", () => {
            it("should end a void data-htmldiff-id tag written without a slash", () => {
                expect(cut('<img data-htmldiff-id="1" src="a.jpg"> tail')).eql(tokenize(['<img data-htmldiff-id="1" src="a.jpg">', " ", "tail"]));
            });

            it("should end a void data-htmldiff-id br tag without swallowing trailing content", () => {
                expect(cut('<br data-htmldiff-id="x">y')).eql(tokenize(['<br data-htmldiff-id="x">', "y"]));
            });
        });
    });
});
