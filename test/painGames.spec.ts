import { expect } from "chai";
import diff from "../src/htmldiff";

describe("Pain Games", () => {
    describe("When an entire sentence is replaced", () => {
        it("should replace the whole chunk", () => {
            const res = diff("this is what I had", "and now we have a new one");
            expect(res).to.equal('<del data-operation-index="0">this is what I had</del>' + '<ins data-operation-index="0">and now we have a new one</ins>');
        });
    });
});
