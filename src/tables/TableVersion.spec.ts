import { expect } from "chai";
import { findElements } from "./html";
import { MergedCells } from "./MergedCells";
import { Table } from "./Table";
import { TableVersion } from "./TableVersion";

describe("TableVersion", () => {
    const ref = (itemRef: string): string => `<smart-link data-htmldiff-id="${itemRef}">${itemRef}</smart-link>`;
    const readTable = (markup: string): Table => Table.read(findElements(markup, ["table"])[0]);
    const version = (markup: string): TableVersion => TableVersion.read(readTable(markup));

    it("reads signatures, shapes and spans", () => {
        const v = version('<table><tbody><tr><td colspan="2">a</td></tr><tr><td>b</td><td>c</td></tr></tbody></table>');
        expect(v.signatures).to.deep.equal([["a"], ["b", "c"]]);
        expect(v.shapes).to.deep.equal(["td:2x1", "td:1x1|td:1x1"]);
        expect(v.columnCount).to.equal(2);
        expect(v.hasSpans).to.equal(true);
        expect(v.signatureAt(1, 1)).to.equal("c");
        expect(v.signatureAt(5, 5)).to.equal("");
    });

    it("compares shapes, counts header rows and slices", () => {
        const a = version("<table><tbody><tr><th>h</th></tr><tr><td>a</td></tr></tbody></table>");
        const b = version("<table><tbody><tr><th>h</th></tr><tr><td>x</td></tr></tbody></table>");
        expect(a.hasSameShapeAs(b)).to.equal(true);
        expect(a.headerRowCount()).to.equal(1);
        expect(a.slice(1).signatures).to.deep.equal([["a"]]);
    });

    it("compares span layouts by the merged cells alone", () => {
        const group = version('<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>');
        const groupAndRow = version('<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr><tr><td>x</td><td>y</td></tr></tbody></table>');
        const grownGroup = version('<table><tbody><tr><td rowspan="3">g</td><td>a</td></tr><tr><td>b</td></tr><tr><td>c</td></tr></tbody></table>');
        const plain = version("<table><tbody><tr><td>g</td><td>a</td></tr><tr><td>h</td><td>b</td></tr></tbody></table>");
        expect(group.hasSameSpanLayoutAs(groupAndRow)).to.equal(true);
        expect(group.hasSameSpanLayoutAs(grownGroup)).to.equal(false);
        expect(group.hasSameSpanLayoutAs(plain)).to.equal(false);
        expect(plain.hasSameSpanLayoutAs(version("<table><tbody><tr><td>z</td></tr></tbody></table>"))).to.equal(true);
    });

    it("recognises a line number column", () => {
        const v = version("<table><tbody><tr><th>#</th><th>n</th></tr><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></tbody></table>");
        expect(v.isSequenceColumn(0)).to.equal(true);
        expect(v.isSequenceColumn(1)).to.equal(false);
    });

    it("counts the values of every column and of the table", () => {
        const v = version("<table><tbody><tr><td>a</td><td></td></tr><tr><td>a</td><td>b</td></tr></tbody></table>");
        expect(v.columnValueCounts()).to.deep.equal([{ a: 2 }, { b: 1 }]);
        expect(v.valueCounts()).to.deep.equal({ a: 2, b: 1 });
    });

    describe("row keys", () => {
        it("has no row keys unless a cell carries its own identity", () => {
            const v = version(`<table><tbody><tr><td>${ref("SPEC-1")}</td><td>${ref("TC-1")}</td></tr></tbody></table>`);
            expect(v.hasRowKeys).to.equal(false);
            expect(v.rowKeys(0)).to.deep.equal([]);
        });

        it("names a keyed row by the identities of its key cells", () => {
            const markup =
                '<table><tbody><tr><td data-htmldiff-id="RISK-1">RISK-1 Fire</td><td>text</td>' +
                `<td>${ref("SPEC-2")}</td><td data-htmldiff-id="XTC-11">${ref("XTC-11")}</td></tr></tbody></table>`;
            const v = version(markup);
            expect(v.hasRowKeys).to.equal(true);
            expect(v.rowKeys(0)).to.deep.equal(["RISK-1", "XTC-11"]);
        });

        it("gives every row of a group the key of its merged cell", () => {
            const table = readTable(
                '<table><tbody><tr><td rowspan="2" data-htmldiff-id="SPEC-1">SPEC-1</td><td data-htmldiff-id="TC-1">TC-1</td></tr>' +
                    '<tr><td data-htmldiff-id="TC-2">TC-2</td></tr></tbody></table>',
            );
            MergedCells.expand(table, "new");
            const v = TableVersion.read(table);
            expect(v.rowKeys(1)).to.deep.equal(["SPEC-1", "TC-2"]);
        });
    });

    describe("groups", () => {
        it("knows the continuation rows of a merged cell and their group", () => {
            const table = readTable('<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>');
            MergedCells.expand(table, "old");
            const v = TableVersion.read(table);
            expect(v.isContinuationRow(0)).to.equal(false);
            expect(v.isContinuationRow(1)).to.equal(true);
            expect(v.groupSignatures(1)).to.deep.equal(["g"]);
            expect(v.ownerOf(v.cells[1][0])).to.equal(v.cells[0][0]);
        });
    });
});
