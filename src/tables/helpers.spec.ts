import { expect } from "chai";
import { flatten, last, range, uniqueValues } from "./helpers";

describe("helpers", () => {
    it("range lists the integers from start up to end", () => {
        expect(range(2, 5)).to.deep.equal([2, 3, 4]);
        expect(range(3, 3)).to.deep.equal([]);
    });

    it("flatten joins arrays", () => {
        expect(flatten([[1], [2, 3], []])).to.deep.equal([1, 2, 3]);
    });

    it("last is the last entry, undefined when empty", () => {
        expect(last([1, 2])).to.equal(2);
        expect(last([])).to.equal(undefined);
    });

    it("uniqueValues keeps the first occurrence", () => {
        expect(uniqueValues(["a", "b", "a"])).to.deep.equal(["a", "b"]);
    });
});
