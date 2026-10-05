import { expect } from "chai";
import { Cell } from "../../src/tables/Cell";
import { findElements } from "../../src/tables/html";
import { Row } from "../../src/tables/Row";
import { Table } from "../../src/tables/Table";

describe("Table", () => {
    const readFirst = (markup: string, inSection = false): Table => Table.read(findElements(markup, ["table"])[0], inSection);
    const row = (text: string): Row => new Row("<tr>", [new Cell("td", "<td>", text, "</td>")], null);

    describe("read", () => {
        it("keeps the markup around the rows as chunks", () => {
            const table = readFirst("<table><thead><tr><th>h</th></tr></thead><tbody><tr><td>a</td></tr></tbody></table>");
            const described = table.chunks.map((chunk) => {
                if (typeof chunk === "string") return chunk;
                if (chunk === table.appendChunk) return "[append]";
                return `[row ${(chunk as Row).container}]`;
            });
            expect(described).to.deep.equal(["<thead>", "[row thead]", "</thead><tbody>", "[row tbody]", "[append]", "</tbody>"]);
        });

        it("appends to the end of a table without a body", () => {
            const table = readFirst("<table><tr><td>a</td></tr></table>");
            expect(table.chunks.length).to.equal(2);
            expect(table.chunks[1]).to.equal(table.appendChunk);
            expect(table.appendChunk.container).to.equal(null);
        });

        it("renders back exactly what it read", () => {
            const markup = "<table><caption>c</caption><thead><tr><th>h</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>";
            const table = readFirst(markup);
            expect(table.openTag + table.renderInner() + table.closeTag).to.equal(markup);
        });
    });

    describe("findTopLevel", () => {
        it("finds outer tables and whether a section holds them", () => {
            const tables = Table.findTopLevel(
                '<div data-shadow-boundary=""><table><tr><td>a</td></tr></table></div><table><tr><td><table><tr><td>in</td></tr></table></td></tr></table>',
            );
            expect(tables.length).to.equal(2);
            expect(tables[0].inSection).to.equal(true);
            expect(tables[1].inSection).to.equal(false);
        });

        it("ignores a closed section", () => {
            const tables = Table.findTopLevel('<div data-shadow-boundary="">x</div><table><tr><td>a</td></tr></table>');
            expect(tables[0].inSection).to.equal(false);
        });
    });

    describe("identity", () => {
        it("keeps its own id and takes a fallback otherwise", () => {
            const own = readFirst('<table data-htmldiff-id="REQ-1"><tr><td>a</td></tr></table>');
            expect(own.ownId()).to.equal("REQ-1");
            expect(own.ensureId("x")).to.equal("REQ-1");
            const none = readFirst("<table><tr><td>a</td></tr></table>");
            expect(none.ownId()).to.equal(undefined);
            expect(none.ensureId("x")).to.equal("x");
            expect(none.openTag).to.equal('<table data-htmldiff-id="x">');
        });
    });

    describe("rows", () => {
        it("orders rows by their row group, direct rows last", () => {
            const table = readFirst("<table><tr><td>direct</td></tr><tbody><tr><td>body</td></tr></tbody></table>");
            expect(table.rows().map((r) => r.cells[0].inner)).to.deep.equal(["body", "direct"]);
        });

        it("renders hung rows in order and knows the next sibling", () => {
            const table = readFirst("<table><tbody><tr><td>a</td></tr></tbody></table>");
            const a = table.rows()[0];
            const b = row("b");
            const c = row("c");
            a.insertBefore(b);
            a.insertAfter(c);
            expect(table.documentRows().map((r) => r.cells[0].inner)).to.deep.equal(["b", "a", "c"]);
            expect(table.renderInner()).to.equal("<tbody><tr><td>b</td></tr><tr><td>a</td></tr><tr><td>c</td></tr></tbody>");
            expect(table.nextSibling(a)).to.equal(c);
            expect(table.nextSibling(c)).to.equal(null);
        });

        it("leaves a detached row out of its place", () => {
            const table = readFirst("<table><tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody></table>");
            const rows = table.rows();
            rows[0].detach();
            rows[1].insertAfter(rows[0]);
            expect(table.renderInner()).to.equal("<tbody><tr><td>b</td></tr><tr><td>a</td></tr></tbody>");
        });

        it("appends a row to the body", () => {
            const table = readFirst("<table><thead><tr><th>h</th></tr></thead><tbody></tbody></table>");
            const appended = row("x");
            table.appendRow(appended);
            expect(appended.container).to.equal("tbody");
            expect(table.renderInner()).to.equal("<thead><tr><th>h</th></tr></thead><tbody><tr><td>x</td></tr></tbody>");
        });
    });
});
