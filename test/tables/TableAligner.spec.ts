import { expect } from "chai";
import { Table } from "../../src/tables/Table";
import { TableAligner } from "../../src/tables/TableAligner";

describe("TableAligner", () => {
    const plain = (cells: string[][], attributes = ""): string =>
        `<table${attributes}><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const section = (cells: string[][]): string => `<div data-shadow-boundary="">${plain(cells)}</div>`;

    it("pairs tables by their own id before anything else", () => {
        const oldTables = Table.findTopLevel(plain([["a"]], ' data-htmldiff-id="REQ-1"') + plain([["b"]], ' data-htmldiff-id="REQ-2"'));
        const newTables = Table.findTopLevel(plain([["b", "x"]], ' data-htmldiff-id="REQ-2"'));
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "same", oldIndex: 1, newIndex: 0 },
        ]);
    });

    it("never pairs tables with different ids", () => {
        const oldTables = Table.findTopLevel(plain([["a"]], ' data-htmldiff-id="REQ-1"'));
        const newTables = Table.findTopLevel(plain([["a"]], ' data-htmldiff-id="REQ-2"'));
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
    });

    it("pairs id-less tables by content", () => {
        const oldTables = Table.findTopLevel(plain([["a", "b"]]) + plain([["c", "d"]]));
        const newTables = Table.findTopLevel(plain([["c", "d", "e"]]));
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "same", oldIndex: 1, newIndex: 0 },
        ]);
    });

    it("keeps a rewritten table in place only inside a section", () => {
        expect(new TableAligner(Table.findTopLevel(plain([["a", "b"]])), Table.findTopLevel(plain([["x", "y"]]))).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
        expect(new TableAligner(Table.findTopLevel(section([["a", "b"]])), Table.findTopLevel(section([["x", "y"]]))).align()).to.deep.equal([
            { kind: "same", oldIndex: 0, newIndex: 0 },
        ]);
    });

    it("keeps section tables apart when their headers differ", () => {
        const headed = (header: string[], cells: string[][]): string =>
            `<div data-shadow-boundary=""><table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${cells
                .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
                .join("")}</tbody></table></div>`;
        const oldTables = Table.findTopLevel(headed(["Test run", "Executed Test Case"], [["TR-4", "TC-4"]]));
        const newTables = Table.findTopLevel(headed(["Items", "Executed Test Case"], [["SPEC-2", "TC-4"]]));
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
        const sameHeader = Table.findTopLevel(headed(["Items", "Executed Test Case"], [["SPEC-9", "TC-1"]]));
        expect(new TableAligner(newTables, sameHeader).align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
    });

    it("keeps tables apart when only repeated filler values recur", () => {
        const oldTables = Table.findTopLevel(
            plain([
                ["sdvvsdvsdv", "sd vsdv", "sfv", "sdvsd"],
                ["sd vsdv", "", "sd vsdv", ""],
                ["sdvsd v", "sdvsdvsdv", "sdv sdv", "sdvsdv"],
                ["s dvsdv", "", "sd vsd v", "sdvsdv"],
            ]),
        );
        const newTables = Table.findTopLevel(
            plain([
                ["sdvsdvsdv", "sdvsdv", "sdvsdv"],
                ["sdvsdv", "sdvsdv", "sdvsdvsdv"],
            ]),
        );
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
    });

    it("keeps rich text tables apart when their merged cells changed", () => {
        const merged = '<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>';
        const unmerged = "<table><tbody><tr><td>g</td><td>a</td></tr><tr><td>h</td><td>b</td></tr></tbody></table>";
        expect(new TableAligner(Table.findTopLevel(unmerged), Table.findTopLevel(merged)).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
        const inSection = (table: string): Table[] => Table.findTopLevel(`<div data-shadow-boundary="">${table}</div>`);
        expect(new TableAligner(inSection(unmerged), inSection(merged)).align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
    });

    it("keeps a table in place that still shares half of the smaller one", () => {
        const oldTables = Table.findTopLevel(plain([["a"], ["b"], ["c"], ["d"]]));
        const newTables = Table.findTopLevel(plain([["a"]]));
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
    });
});
