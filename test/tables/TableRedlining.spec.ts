import { expect } from "chai";
import { TableRedlining } from "../../src/tables/TableRedlining";

describe("TableRedlining", () => {
    const diffContent = (before: string, after: string): string => `[${before}>${after}]`;
    const redline = (before: string, after: string): { before: string; after: string } => new TableRedlining(diffContent).redline(before, after);
    const plain = (cells: string[][], attributes = ""): string =>
        `<table${attributes}><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

    it("leaves documents without tables alone", () => {
        expect(redline("<p>a</p>", "<p>b</p>")).to.deep.equal({ before: "<p>a</p>", after: "<p>b</p>" });
    });

    it("gives both versions of a pair the same id and writes the merged table into the after html", () => {
        const result = redline(`<p>t</p>${plain([["a", "b"]])}`, `<p>t</p>${plain([["a", "c"]])}`);
        expect(result.before).to.equal('<p>t</p><table data-htmldiff-id="redline-table-0"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>');
        expect(result.after).to.equal('<p>t</p><table data-htmldiff-id="redline-table-0"><tbody><tr><td>a</td><td>[b>c]</td></tr></tbody></table>');
    });

    it("keeps a table's own id and drops its inner diff marker", () => {
        const result = redline(
            plain([["a"]], ' data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"'),
            plain([["a"], ["b"]], ' data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"'),
        );
        expect(result.after).to.equal('<table data-htmldiff-id="REQ-1"><tbody><tr><td>a</td></tr><tr class="table-row-added"><td>b</td></tr></tbody></table>');
    });

    it("gives an unpaired table an id of its own", () => {
        expect(redline("", plain([["a"]])).after).to.equal('<table data-htmldiff-id="redline-table-added-0"><tbody><tr><td>a</td></tr></tbody></table>');
        expect(redline(plain([["a"]]), "").before).to.equal('<table data-htmldiff-id="redline-table-deleted-0"><tbody><tr><td>a</td></tr></tbody></table>');
    });
});
