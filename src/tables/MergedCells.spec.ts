import { expect } from "chai";
import { findElements } from "./html";
import { MergedCells } from "./MergedCells";
import { Alignment } from "./SequenceAligner";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

describe("MergedCells", () => {
    const readTable = (markup: string): Table => Table.read(findElements(markup, ["table"])[0]);
    const layout = (table: Table): string[] =>
        table.rows().map((row) =>
            row.cells
                .map((cell) => {
                    if (cell.removed) return "-";
                    if (cell.mergedKey) return `[${cell.inner}]`;
                    return cell.partOf ? `(${cell.partOf})` : cell.inner;
                })
                .join(" "),
        );
    const twoColumns: Alignment[] = [
        { kind: "same", oldIndex: 0, newIndex: 0 },
        { kind: "same", oldIndex: 1, newIndex: 1 },
    ];

    describe("expand", () => {
        it("splits a merged cell into the cell and empty parts", () => {
            const table = readTable('<table><tbody><tr><td rowspan="2" colspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>');
            MergedCells.expand(table, "old");
            expect(layout(table)).to.deep.equal(["[g] (old-0-0) a", "(old-0-0) (old-0-0) b"]);
            expect(table.rows()[0].cells[0].openTag).to.equal("<td>");
        });
    });

    describe("fold", () => {
        it("spans a merged cell over its empty parts again", () => {
            const table = readTable('<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>');
            MergedCells.expand(table, "new");
            const version = TableVersion.read(table);
            new MergedCells(version, version).fold();
            expect(layout(table)).to.deep.equal(["[g] a", "- b"]);
            expect(table.rows()[0].cells[0].openTag).to.equal('<td rowspan="2">');
        });

        it("does not span over a row of another kind", () => {
            const table = readTable('<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>');
            MergedCells.expand(table, "new");
            const version = TableVersion.read(table);
            table.rows()[1].added = true;
            new MergedCells(version, version).fold();
            expect(layout(table)).to.deep.equal(["[g] a", "(new-0-0) b"]);
        });

        it("lets a changed cell span its own row only", () => {
            const table = readTable('<table><tbody><tr><td colspan="2" rowspan="2">g</td></tr><tr></tr></tbody></table>');
            MergedCells.expand(table, "old");
            const version = TableVersion.read(table);
            const rows = table.rows();
            rows[0].changedInGroup = true;
            rows[0].changeClass = "table-cell-deleted";
            rows[0].cells[0].openTag = '<td class="table-cell-deleted">';
            new MergedCells(version, version).fold();
            expect(table.rows()[0].cells[0].openTag).to.equal('<td class="table-cell-deleted" colspan="2">');
            expect(layout(table)).to.deep.equal(["[g] -", "(old-0-0) (old-0-0)"]);
        });

        it("gives a part left alone in a changed row the row's change", () => {
            const table = readTable("<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>");
            const version = TableVersion.read(table);
            const row = table.rows()[0];
            row.changedInGroup = true;
            row.changeClass = "table-cell-added";
            row.cells[1].partOf = "gone";
            row.cells[1].inner = "";
            new MergedCells(version, version).fold();
            expect(row.cells[1].openTag).to.equal('<td class="table-cell-added">');
        });
    });

    describe("moveOwnersToKeptRows", () => {
        it("moves the merged cell onto the first kept row of its group", () => {
            const oldTable = readTable('<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>');
            const newTable = readTable("<table><tbody><tr><td>g</td><td>b</td></tr></tbody></table>");
            MergedCells.expand(oldTable, "old");
            const oldVersion = TableVersion.read(oldTable);
            const newVersion = TableVersion.read(newTable);
            new MergedCells(oldVersion, newVersion).moveOwnersToKeptRows(twoColumns, [
                { kind: "deleted", oldIndex: 0 },
                { kind: "same", oldIndex: 1, newIndex: 0 },
            ]);
            expect(layout(oldTable)).to.deep.equal(["(old-0-0) a", "[g] b"]);
            // the plain new cell took over the old merged cell
            expect(newVersion.cells[0][0].mergedKey).to.equal("old-0-0");
            expect(newVersion.mergedCells["old-0-0"]).to.equal("g");
        });
    });
});
