import { expect } from "chai";
import {
    buildAtomicTagsRegExp,
    defaultAtomicTagsRegExp,
    getAtomicTagsRegExp,
    isStartOfAtomicTag,
    noAtomicTagsRegExp,
    setAtomicTagsRegExp,
} from "./atomicTags";

describe("atomicTags", () => {
    // the active atomic tags are module state: leave them as found for the other specs
    afterEach(() => {
        setAtomicTagsRegExp(defaultAtomicTagsRegExp);
    });

    describe("buildAtomicTagsRegExp", () => {
        it("matches the listed tags followed by a delimiter", () => {
            const regExp = buildAtomicTagsRegExp("head, script,style");
            expect(regExp.test("<script>")).to.equal(true);
            expect(regExp.test("<style ")).to.equal(true);
            expect(regExp.test("<head/>")).to.equal(true);
        });

        it("does not match a longer tag name starting with a listed one", () => {
            expect(buildAtomicTagsRegExp("a").test("<abbr>")).to.equal(false);
        });
    });

    describe("isStartOfAtomicTag", () => {
        it("names the atomic tag a word starts", () => {
            expect(isStartOfAtomicTag("<svg ")).to.equal("svg");
        });

        it("treats an element with data-htmldiff-id as atomic whatever its tag", () => {
            expect(isStartOfAtomicTag('<span data-htmldiff-id="x">')).to.equal("span");
        });

        it("returns null for other tags", () => {
            expect(isStartOfAtomicTag("<p>")).to.equal(null);
        });

        it("follows the active atomic tags", () => {
            setAtomicTagsRegExp(buildAtomicTagsRegExp("p"));
            expect(isStartOfAtomicTag("<p>")).to.equal("p");
            expect(isStartOfAtomicTag("<svg>")).to.equal(null);
        });
    });

    describe("getAtomicTagsRegExp", () => {
        it("returns what was set", () => {
            setAtomicTagsRegExp(noAtomicTagsRegExp);
            expect(getAtomicTagsRegExp()).to.equal(noAtomicTagsRegExp);
        });
    });
});
