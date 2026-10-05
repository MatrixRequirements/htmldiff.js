import { expect } from "chai";
import diff from "../src/htmldiff";

describe("The module", () => {
    it("should return a function", () => {
        expect(diff).is.a("function");
    });
});
