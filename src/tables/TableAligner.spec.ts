import { expect } from "chai";
import { Table } from "./Table";
import { TableAligner } from "./TableAligner";

describe("TableAligner", () => {
    const plain = (cells: string[][], attributes = ""): string =>
        `<table${attributes}><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    // the first cell of every row names the row, as a generated table marks it
    const keyed = (cells: string[][]): string =>
        `<table><tbody>${cells
            .map((row) => `<tr>${row.map((cell, index) => (index === 0 ? `<td data-htmldiff-id="${cell}">${cell}</td>` : `<td>${cell}</td>`)).join("")}</tr>`)
            .join("")}</tbody></table>`;

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

    it("keeps a rewritten table in place only when its rows are keyed", () => {
        expect(new TableAligner(Table.findTopLevel(plain([["a", "b"]])), Table.findTopLevel(plain([["x", "y"]]))).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
        expect(new TableAligner(Table.findTopLevel(keyed([["a", "b"]])), Table.findTopLevel(keyed([["x", "y"]]))).align()).to.deep.equal([
            { kind: "same", oldIndex: 0, newIndex: 0 },
        ]);
    });

    it("keeps keyed tables apart when their headers differ", () => {
        const headed = (header: string[], cells: string[][]): string =>
            `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${cells
                .map((row) => `<tr>${row.map((cell, index) => (index === 0 ? `<td data-htmldiff-id="${cell}">${cell}</td>` : `<td>${cell}</td>`)).join("")}</tr>`)
                .join("")}</tbody></table>`;
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

    it("keeps unkeyed tables apart when their merged cells changed", () => {
        const merged = '<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>';
        const unmerged = "<table><tbody><tr><td>g</td><td>a</td></tr><tr><td>h</td><td>b</td></tr></tbody></table>";
        expect(new TableAligner(Table.findTopLevel(unmerged), Table.findTopLevel(merged)).align()).to.deep.equal([
            { kind: "deleted", oldIndex: 0 },
            { kind: "added", newIndex: 0 },
        ]);
        const keyedMerged = '<table><tbody><tr><td rowspan="2" data-htmldiff-id="g">g</td><td data-htmldiff-id="a">a</td></tr><tr><td data-htmldiff-id="b">b</td></tr></tbody></table>';
        const keyedUnmerged = '<table><tbody><tr><td data-htmldiff-id="g">g</td><td data-htmldiff-id="a">a</td></tr><tr><td data-htmldiff-id="h">h</td><td data-htmldiff-id="b">b</td></tr></tbody></table>';
        expect(new TableAligner(Table.findTopLevel(keyedUnmerged), Table.findTopLevel(keyedMerged)).align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
    });

    it("keeps a table in place that still shares half of the smaller one", () => {
        const oldTables = Table.findTopLevel(plain([["a"], ["b"], ["c"], ["d"]]));
        const newTables = Table.findTopLevel(plain([["a"]]));
        expect(new TableAligner(oldTables, newTables).align()).to.deep.equal([{ kind: "same", oldIndex: 0, newIndex: 0 }]);
    });
});
