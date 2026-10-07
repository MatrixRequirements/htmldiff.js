import { expect } from "chai";
import { Cell } from "./Cell";

describe("Cell", () => {
    const cell = (openTag = "<td>", inner = ""): Cell => new Cell("td", openTag, inner, "</td>");

    describe("readRow", () => {
        it("reads td and th cells", () => {
            const cells = Cell.readRow('<th>h</th><td class="c">d</td>');
            expect(cells.map((c) => [c.tag, c.openTag, c.inner])).to.deep.equal([
                ["th", "<th>", "h"],
                ["td", '<td class="c">', "d"],
            ]);
        });
    });

    describe("ownId", () => {
        it("reads the cell's own identity", () => {
            expect(cell('<td data-htmldiff-id="TC-3">', "TC-3 text").ownId()).to.equal("TC-3");
            expect(cell("<td>", '<smart-link data-htmldiff-id="TC-3">TC-3</smart-link>').ownId()).to.equal(null);
        });
    });

    describe("signature", () => {
        it("is the collapsed text", () => {
            expect(cell("<td>", "  a <b>b</b>\n c ").signature()).to.equal("a b c");
        });

        it("adds the identities of atomic elements and images", () => {
            expect(cell("<td>", '<smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link> t <img src="i.png" />').signature()).to.equal(
                "REQ-1 t|REQ-1|i.png",
            );
        });

        it("ignores hidden helpers", () => {
            expect(cell("<td>", '<span aria-hidden="true" data-htmldiff-id="x">hidden</span>shown').signature()).to.equal("shown");
        });

        it("decodes entities and ignores comments", () => {
            expect(cell("<td>", "a&amp;b<!-- c -->").signature()).to.equal("a&b");
        });

        it("is empty for an empty cell", () => {
            expect(cell().signature()).to.equal("");
        });
    });

    describe("span and shape", () => {
        it("reads spans, defaulting to 1", () => {
            expect(cell('<td colspan="3">').span("colspan")).to.equal(3);
            expect(cell('<td colspan="0">').span("colspan")).to.equal(1);
            expect(cell().span("rowspan")).to.equal(1);
        });

        it("describes the shape", () => {
            expect(cell('<td colspan="2" rowspan="3">').shape()).to.equal("td:2x3");
        });
    });

    describe("placeholders, parts and classes", () => {
        it("creates a placeholder with the siblings' tag", () => {
            const th = Cell.placeholder([new Cell("th", "<th>", "", "</th>")], "x");
            expect(th.render()).to.equal('<th class="x"></th>');
            expect(Cell.placeholder([]).render()).to.equal("<td></td>");
        });

        it("creates a part standing for a merged cell", () => {
            const part = Cell.part("k", []);
            expect(part.partOf).to.equal("k");
            expect(part.render()).to.equal("<td></td>");
        });

        it("adds and detects change classes", () => {
            const c = cell('<td class="a">', "x");
            expect(c.hasChangeClass()).to.equal(false);
            c.addClass("table-cell-deleted");
            expect(c.openTag).to.equal('<td class="a table-cell-deleted">');
            expect(c.hasChangeClass()).to.equal(true);
        });

        it("renders nothing for a removed cell", () => {
            const c = cell("<td>", "x");
            c.removed = true;
            expect(c.render()).to.equal("");
        });

        it("clones a cell without its removal", () => {
            const c = cell("<td>", "x");
            c.removed = true;
            c.mergedKey = "k";
            const copy = c.clone();
            expect(copy.removed).to.equal(false);
            expect(copy.mergedKey).to.equal("k");
            expect(copy).to.not.equal(c);
        });
    });
});
