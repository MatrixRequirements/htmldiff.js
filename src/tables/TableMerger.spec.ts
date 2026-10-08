import { expect } from "chai";
import { findElements } from "./html";
import { Table } from "./Table";
import { TableMerger } from "./TableMerger";

describe("TableMerger", () => {
    const diffContent = (before: string, after: string): string => `[${before}>${after}]`;
    const readTable = (markup: string): Table => Table.read(findElements(markup, ["table"])[0]);
    const plain = (cells: string[][]): string =>
        `<table><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const merge = (oldMarkup: string, newMarkup: string): string => new TableMerger(readTable(oldMarkup), readTable(newMarkup), diffContent).merge();

    it("diffs kept cells with the injected diff", () => {
        expect(merge(plain([["a", "b"]]), plain([["a", "c"]]))).to.equal("<tbody><tr><td>a</td><td>[b>c]</td></tr></tbody>");
    });

    it("marks added and deleted rows whole", () => {
        expect(merge(plain([["a"], ["b"]]), plain([["a"], ["c"]]))).to.equal(
            '<tbody><tr><td>a</td></tr><tr class="table-row-deleted"><td>b</td></tr><tr class="table-row-added"><td>c</td></tr></tbody>',
        );
    });

    it("marks a deleted column on its cells and the colgroup", () => {
        expect(
            merge(
                "<table><colgroup><col /><col /></colgroup><tbody><tr><td>a</td><td>b</td></tr></tbody></table>",
                "<table><colgroup><col /></colgroup><tbody><tr><td>a</td></tr></tbody></table>",
            ),
        ).to.equal('<colgroup><col /><col class="table-cell-deleted" /></colgroup><tbody><tr><td>a</td><td class="table-cell-deleted">b</td></tr></tbody>');
    });

    it("adds a placeholder for an added column in a deleted row", () => {
        expect(merge(plain([["a"], ["c"]]), plain([["a", "b"]]))).to.equal(
            '<tbody><tr><td>a</td><td class="table-cell-added">b</td></tr><tr class="table-row-deleted"><td>c</td><td class="table-cell-added"></td></tr></tbody>',
        );
    });

    it("diffs by position when the merged layout did not change", () => {
        const markup = (value: string): string => `<table><tbody><tr><td rowspan="2">g</td><td>${value}</td></tr><tr><td>c</td></tr></tbody></table>`;
        expect(merge(markup("a"), markup("b"))).to.equal('<tbody><tr><td rowspan="2">g</td><td>[a>b]</td></tr><tr><td>c</td></tr></tbody>');
    });

    it("keeps a merged header and diffs the body rows under it", () => {
        const header = '<thead><tr><th colspan="2">h</th></tr></thead>';
        expect(
            merge(
                `<table>${header}<tbody><tr><td>a</td><td>b</td></tr></tbody></table>`,
                `<table>${header}<tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>`,
            ),
        ).to.equal(`${header}<tbody><tr><td>a</td><td>b</td></tr><tr class="table-row-added"><td>c</td><td>d</td></tr></tbody>`);
    });

    it("leaves a row without cells as it is", () => {
        expect(
            merge("<table><tbody><tr><td>a</td></tr><tr></tr></tbody></table>", "<table><tbody><tr><td>a</td></tr><tr><td>b</td></tr><tr></tr></tbody></table>"),
        ).to.equal('<tbody><tr><td>a</td></tr><tr class="table-row-added"><td>b</td></tr><tr></tr></tbody>');
    });

    it("hangs a deleted row under the kept rows of its group with the change on its cells", () => {
        expect(
            merge(
                '<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>',
                "<table><tbody><tr><td>g</td><td>a</td></tr></tbody></table>",
            ),
        ).to.equal('<tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td class="table-cell-deleted">b</td></tr></tbody>');
    });

    it("never puts a deleted row into the header", () => {
        expect(
            merge(
                "<table><thead><tr><th>h</th></tr></thead><tbody><tr><td>a</td></tr></tbody></table>",
                "<table><thead><tr><th>h</th></tr></thead><tbody></tbody></table>",
            ),
        ).to.equal('<thead><tr><th>h</th></tr></thead><tbody><tr class="table-row-deleted"><td>a</td></tr></tbody>');
    });
});
