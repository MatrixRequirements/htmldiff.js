import { expect } from "chai";
import { Cell } from "../../src/tables/Cell";
import { Row } from "../../src/tables/Row";

describe("Row", () => {
    const row = (text: string): Row => new Row("<tr>", [new Cell("td", "<td>", text, "</td>")], "tbody");

    it("tells its kind", () => {
        const r = row("a");
        expect(r.kind()).to.equal("kept");
        r.added = true;
        expect(r.kind()).to.equal("added");
        r.deleted = true;
        expect(r.kind()).to.equal("deleted");
    });

    it("renders its cells and the rows hung onto it", () => {
        const a = row("a");
        const b = row("b");
        const c = row("c");
        a.insertBefore(b);
        a.insertAfter(c);
        expect(a.render()).to.equal("<tr><td>b</td></tr><tr><td>a</td></tr><tr><td>c</td></tr>");
    });

    it("hangs later rows right after itself, like Element.after", () => {
        const a = row("a");
        a.insertAfter(row("x"));
        a.insertAfter(row("y"));
        expect(a.render()).to.equal("<tr><td>a</td></tr><tr><td>y</td></tr><tr><td>x</td></tr>");
    });

    it("gives a hung row its own row group", () => {
        const a = row("a");
        const b = new Row("<tr>", [], null);
        a.insertBefore(b);
        expect(b.container).to.equal("tbody");
    });

    it("collects itself and its hung rows in document order", () => {
        const a = row("a");
        const b = row("b");
        const c = row("c");
        a.insertBefore(b);
        b.insertAfter(c);
        const rows: Row[] = [];
        a.collect(rows);
        expect(rows.map((r) => r.cells[0].inner)).to.deep.equal(["b", "c", "a"]);
    });

    it("skips removed cells when rendering", () => {
        const r = row("a");
        r.cells[0].removed = true;
        expect(r.render()).to.equal("<tr></tr>");
    });
});
