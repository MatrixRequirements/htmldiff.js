import { expect } from "chai";
import diff from "../src/htmldiff";

describe("tables", () => {

    describe("rows", () => {
        it("marks whole added row when another cell is edited", () => {
            const res = diff('<div class="rich-text-editor"><p class="p"><span data-htmldiff-id="p|h1|" data-htmldiff-inner-diff="true" class="htmldiff__block-conversion h1"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">A B C D E</strong></span></p></div>','<div class="rich-text-editor"><p class="p"><span data-htmldiff-id="p|h1|" data-htmldiff-inner-diff="true" class="htmldiff__block-conversion h1"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">A B <em data-htmldiff-id="em|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">C</em> D E</strong></span></p></div>');
            expect(res).to.equal(
                '<div class="rich-text-editor"><p class="p"><span data-htmldiff-id="p|h1|" data-htmldiff-inner-diff="true" class="htmldiff__block-conversion h1"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">A B ' +
                '<del data-operation-index="1">C</del>' +
                '<ins data-operation-index="1"><em data-htmldiff-id="em|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">C</em></ins> D E</strong></span></p></div>');
        });

        it("leaves row without cells empty", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td><td></td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>x</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td>' +
                '<ins data-operation-index="0">x</ins></td></tr></tbody>' +
                '</table>');
        });

        it("marks whole deleted row", () => {
            const res = diff('<div class="rich-text-editor"><p class="p"><span data-htmldiff-id="p|h1|" data-htmldiff-inner-diff="true" class="htmldiff__block-conversion h1"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format"><em data-htmldiff-id="em|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">text</em></strong></span></p></div>','<div class="rich-text-editor"><p class="p"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format"><em data-htmldiff-id="em|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">text</em></strong></p></div>');
            expect(res).to.equal(
                '<div class="rich-text-editor"><p class="p">' +
                '<del data-operation-index="1"><span data-htmldiff-id="p|h1|" data-htmldiff-inner-diff="true" class="htmldiff__block-conversion h1"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format"><em data-htmldiff-id="em|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">text</em></strong></span></del>' +
                '<ins data-operation-index="1"><strong data-htmldiff-id="strong|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format"><em data-htmldiff-id="em|" data-htmldiff-inner-diff="true" class="htmldiff__inline-format">text</em></strong></ins></p></div>');
        });

        it("marks added row without changing edited row elsewhere", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>1</td><td>a</td></tr>' +
                '<tr><td>2</td><td>b</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>1</td><td>a</td></tr>' +
                '<tr><td>2</td><td>x</td></tr>' +
                '<tr><td>3</td><td>b</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>1</td><td>a</td></tr>' +
                '<tr class="table-row-added"><td>2</td><td>x</td></tr>' +
                '<tr><td>' +
                '<del data-operation-index="0">2</del>' +
                '<ins data-operation-index="0">3</ins></td><td>b</td></tr></tbody>' +
                '</table>');
        });

        it("marks row inserted in the middle", () => {
            const res = diff('<div class="rich-text-editor"><blockquote data-htmldiff-id="blockquote" data-htmldiff-inner-diff=""><p class="p">text</p></blockquote></div>','<div class="rich-text-editor"><p class="p">text</p></div>');
            expect(res).to.equal(
                '<div class="rich-text-editor">' +
                '<del data-operation-index="1"><blockquote data-htmldiff-id="blockquote" data-htmldiff-inner-diff=""><p class="p">text</p></blockquote></del><p class="p" data-diff-node="ins" data-operation-index="1">' +
                '<ins data-operation-index="1">text</ins></p></div>');
        });

        it("marks moved row as deleted and added", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>x</td><td>y</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr class="table-row-deleted"><td>c</td><td>d</td></tr>' +
                '<tr class="table-row-added"><td>x</td><td>y</td></tr></tbody>' +
                '</table>');
        });

        it("keeps filling an empty cell as cell edit", () => {
            const res = diff('<div class="rich-text-editor"><blockquote data-htmldiff-id="blockquote" data-htmldiff-inner-diff=""><p class="p">text here</p></blockquote></div>','<div class="rich-text-editor"><blockquote data-htmldiff-id="blockquote" data-htmldiff-inner-diff=""><p class="p">text HERE</p></blockquote></div>');
            expect(res).to.equal(
                '<div class="rich-text-editor"><blockquote data-htmldiff-id="blockquote" data-htmldiff-inner-diff=""><p class="p">text ' +
                '<del data-operation-index="1">here</del>' +
                '<ins data-operation-index="1">HERE</ins></p></blockquote></div>');
        });

        it("ignores line number column when matching rows", () => {
            const res = diff('<div class="rich-text-editor"><ul class="tox-checklist"><li><span data-htmldiff-id="checkbox|false" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content">buy milk</span></li></ul></div>','<div class="rich-text-editor"><ul class="tox-checklist"><li><span data-htmldiff-id="checkbox|false" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content">buy oat milk</span></li></ul></div>');
            expect(res).to.equal(
                '<div class="rich-text-editor"><ul class="tox-checklist"><li><span data-htmldiff-id="checkbox|false" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content">buy ' +
                '<ins data-operation-index="1">oat </ins>milk</span></li></ul></div>');
        });

        it("fills an empty row in place as a cell edit", () => {
            const res = diff('<table><tbody><tr><td>a</td><td>b</td></tr><tr><td></td><td></td></tr></tbody></table>',
                '<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>x</td><td></td></tr><tr><td>y</td><td>z</td></tr></tbody></table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td><ins data-operation-index="0">x</ins></td><td></td></tr>' +
                '<tr class="table-row-added"><td>y</td><td>z</td></tr></tbody></table>');
        });

        it("keeps the line number column when every kept row renumbers", () => {
            const res = diff('<table><tbody><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr><tr><td>3</td><td>c</td></tr><tr><td>4</td><td>d</td></tr><tr><td>5</td><td>e</td></tr></tbody></table>',
                '<table><tbody><tr><td>1</td><td>c</td></tr><tr><td>2</td><td>d</td></tr><tr><td>3</td><td>e</td></tr><tr><td>4</td><td>a</td></tr><tr><td>5</td><td>b</td></tr></tbody></table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr class="table-row-deleted"><td>1</td><td>a</td></tr>' +
                '<tr class="table-row-deleted"><td>2</td><td>b</td></tr>' +
                '<tr><td><del data-operation-index="0">3</del><ins data-operation-index="0">1</ins></td><td>c</td></tr>' +
                '<tr><td><del data-operation-index="0">4</del><ins data-operation-index="0">2</ins></td><td>d</td></tr>' +
                '<tr><td><del data-operation-index="0">5</del><ins data-operation-index="0">3</ins></td><td>e</td></tr>' +
                '<tr class="table-row-added"><td>4</td><td>a</td></tr>' +
                '<tr class="table-row-added"><td>5</td><td>b</td></tr></tbody></table>');
        });

        it("marks fully changed row as deleted and added", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td><td>a</td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td>b</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td><td>a</td></tr>' +
                '<tr><td data-htmldiff-id="TC-9"><smart-link data-htmldiff-id="TC-9">TC-9</smart-link></td><td>b</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td><td>a</td></tr><tr class="table-row-deleted"><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td>b</td></tr><tr class="table-row-added"><td data-htmldiff-id="TC-9"><smart-link data-htmldiff-id="TC-9">TC-9</smart-link></td><td>b</td></tr></tbody></table></div>');
        });
    });

    describe("rows of generated tables", () => {
        it("keeps rows of different items apart", () => {
            const res = diff('<div class="rich-text-editor"><ul class="tox-checklist"><li><span data-htmldiff-id="checkbox|false" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content">task</span></li></ul></div>','<div class="rich-text-editor"><ul class="tox-checklist"><li class="tox-checklist--checked"><span data-htmldiff-id="checkbox|true" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content tox-checklist--checked">task</span></li></ul></div>');
            expect(res).to.equal(
                '<div class="rich-text-editor"><ul class="tox-checklist"><li class="tox-checklist--checked">' +
                '<del data-operation-index="1"><span data-htmldiff-id="checkbox|false" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content">task</span></del>' +
                '<ins data-operation-index="1"><span data-htmldiff-id="checkbox|true" data-htmldiff-inner-diff="true" class="htmldiff__checklist-content tox-checklist--checked">task</span></ins></li></ul></div>');
        });

        it("replaces the rows of an item when none of them keep their keys", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-1"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td colspan="3">not covered</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="2"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td><td data-htmldiff-id="XTC-22"><smart-link data-htmldiff-id="XTC-22">XTC-22</smart-link></td><td>other</td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td data-htmldiff-id="XTC-23"><smart-link data-htmldiff-id="XTC-23">XTC-23</smart-link></td><td>other</td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="SPEC-1"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td colspan="3">not covered</td></tr><tr class="table-row-added"><td data-htmldiff-id="SPEC-1" rowspan="2"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td><td data-htmldiff-id="XTC-22"><smart-link data-htmldiff-id="XTC-22">XTC-22</smart-link></td><td>other</td></tr><tr class="table-row-added"><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td data-htmldiff-id="XTC-23"><smart-link data-htmldiff-id="XTC-23">XTC-23</smart-link></td><td>other</td></tr></tbody></table></div>');
        });

        it("replaces the missing-trace row when the item gains its first trace", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-7"><smart-link data-htmldiff-id="SPEC-7">SPEC-7</smart-link></td><td>Missing trace to TC</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-7"><smart-link data-htmldiff-id="SPEC-7">SPEC-7</smart-link></td><td data-htmldiff-id="TC-5"><smart-link data-htmldiff-id="TC-5">TC-5</smart-link></td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="SPEC-7"><smart-link data-htmldiff-id="SPEC-7">SPEC-7</smart-link></td><td>Missing trace to TC</td></tr><tr class="table-row-added"><td data-htmldiff-id="SPEC-7"><smart-link data-htmldiff-id="SPEC-7">SPEC-7</smart-link></td><td data-htmldiff-id="TC-5"><smart-link data-htmldiff-id="TC-5">TC-5</smart-link></td></tr></tbody></table></div>');
        });

        it("diffs the links cell when a linked item is added", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="REQ-1"><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link></td><td><smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="REQ-1"><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link></td><td><smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link> <smart-link data-htmldiff-id="REQ-3">REQ-3</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="REQ-1"><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link></td><td><smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link><ins data-operation-index="1"><smart-link data-htmldiff-id="REQ-3">REQ-3</smart-link></ins></td></tr></tbody></table></div>');
        });

        it("diffs the row of an item whose value changed and whose controls gained a ref", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="RISK-9"><smart-link data-htmldiff-id="RISK-9">RISK-9</smart-link> Grab Bar</td><td>Inadequate grip</td><td>2</td><td><smart-link data-htmldiff-id="SPEC-18">SPEC-18</smart-link> IFU</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="RISK-9"><smart-link data-htmldiff-id="RISK-9">RISK-9</smart-link> Grab Bar</td><td>Inadequate grip</td><td>3</td><td><smart-link data-htmldiff-id="SPEC-8">SPEC-8</smart-link> RF <smart-link data-htmldiff-id="SPEC-18">SPEC-18</smart-link> IFU</td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="RISK-9"><smart-link data-htmldiff-id="RISK-9">RISK-9</smart-link> Grab Bar</td><td>Inadequate grip</td><td><del data-operation-index="0">2</del><ins data-operation-index="0">3</ins></td><td><ins data-operation-index="0"><smart-link data-htmldiff-id="SPEC-8">SPEC-8</smart-link></ins><ins data-operation-index="0"> RF </ins><smart-link data-htmldiff-id="SPEC-18">SPEC-18</smart-link> IFU</td></tr></tbody></table></div>');
        });


        // a producer may give the cells naming a row their own identity: then those alone pair the rows
        describe("keyed rows", () => {
            const section = (rows: string): string => `<div><table><tbody>${rows}</tbody></table></div>`;

            it("diffs the cells of an executed test when its keys are unchanged", () => {
                const key = (itemRef: string): string => `<td data-htmldiff-id="${itemRef}"><smart-link data-htmldiff-id="${itemRef}">${itemRef}</smart-link></td>`;
                const row = (cells: string[]): string => `<tr>${key("TR-3")}${key("TC-1")}${key("XTC-11")}${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
                const res = diff(section(row(["", "", "0s", "pending"])), section(row(["2026/10/05", "jdoe", "4s", "passed"])));
                expect(res).to.equal(
                    '<div><table data-htmldiff-id="redline-table-0"><tbody>' +
                        `<tr>${key("TR-3")}${key("TC-1")}${key("XTC-11")}` +
                        '<td><ins data-operation-index="0">2026/10/05</ins></td>' +
                        '<td><ins data-operation-index="0">jdoe</ins></td>' +
                        '<td><del data-operation-index="0">0s</del><ins data-operation-index="0">4s</ins></td>' +
                        '<td><del data-operation-index="0">pending</del><ins data-operation-index="0">passed</ins></td></tr>' +
                        "</tbody></table></div>",
                );
            });

            it("diffs the controls cell of a keyed risk row when a control was swapped", () => {
                const row = (control: string): string =>
                    `<tr><td data-htmldiff-id="RISK-1"><smart-link data-htmldiff-id="RISK-1">RISK-1</smart-link> Fire</td><td>Fire</td>` +
                    `<td><smart-link data-htmldiff-id="${control}">${control}</smart-link></td></tr>`;
                const res = diff(section(row("SPEC-2")), section(row("SPEC-7")));
                expect(res).to.equal(
                    '<div><table data-htmldiff-id="redline-table-0"><tbody>' +
                        '<tr><td data-htmldiff-id="RISK-1"><smart-link data-htmldiff-id="RISK-1">RISK-1</smart-link> Fire</td><td>Fire</td>' +
                        '<td><del data-operation-index="0"><smart-link data-htmldiff-id="SPEC-2">SPEC-2</smart-link></del><ins data-operation-index="0"><smart-link data-htmldiff-id="SPEC-7">SPEC-7</smart-link></ins></td></tr>' +
                        "</tbody></table></div>",
                );
            });

            it("keeps a keyed trace row apart when its trace was swapped", () => {
                const row = (trace: string): string => `<tr><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="${trace}">${trace} text</td></tr>`;
                const res = diff(section(row("TC-3")), section(row("TC-4")));
                expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="TC-3">TC-3 text</td></tr><tr class="table-row-added"><td data-htmldiff-id="SPEC-6">SPEC-6</td><td data-htmldiff-id="TC-4">TC-4 text</td></tr></tbody></table></div>');
            });
        });

        it("keeps executions of different test cases apart", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="2"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td><td data-htmldiff-id="TR-4"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td>other</td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td data-htmldiff-id="TR-4"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td>other</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="2"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td><td data-htmldiff-id="TR-4"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td>other</td></tr>' +
                '<tr><td data-htmldiff-id="TC-9"><smart-link data-htmldiff-id="TC-9">TC-9</smart-link></td><td data-htmldiff-id="TR-4"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td>other</td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="3"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td><td data-htmldiff-id="TR-4"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td>other</td></tr><tr><td data-htmldiff-id="TC-2" class="table-cell-deleted"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td data-htmldiff-id="TR-4" class="table-cell-deleted"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td class="table-cell-deleted">other</td></tr><tr><td data-htmldiff-id="TC-9" class="table-cell-added"><smart-link data-htmldiff-id="TC-9">TC-9</smart-link></td><td data-htmldiff-id="TR-4" class="table-cell-added"><smart-link data-htmldiff-id="TR-4">TR-4</smart-link></td><td class="table-cell-added">other</td></tr></tbody></table></div>');
        });

        it("replaces the rows of an item that lost every trace", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-6" rowspan="2"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link> Mounting</td></tr><tr><td data-htmldiff-id="TC-4"><smart-link data-htmldiff-id="TC-4">TC-4</smart-link> App</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-6"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td></td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="SPEC-6" rowspan="2"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link> Mounting</td></tr><tr class="table-row-deleted"><td data-htmldiff-id="TC-4"><smart-link data-htmldiff-id="TC-4">TC-4</smart-link> App</td></tr><tr class="table-row-added"><td data-htmldiff-id="SPEC-6"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td></td></tr></tbody></table></div>');
        });

        it("replaces the row of an item that gained a trace", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-6"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td></td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-6"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link> Mounting</td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="SPEC-6"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td></td></tr><tr class="table-row-added"><td data-htmldiff-id="SPEC-6"><smart-link data-htmldiff-id="SPEC-6">SPEC-6</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link> Mounting</td></tr></tbody></table></div>');
        });

        it("splits row when its item changes and links stay", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-3"><smart-link data-htmldiff-id="SPEC-3">SPEC-3</smart-link></td><td><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link> <smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link> <smart-link data-htmldiff-id="REQ-4">REQ-4</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-2"><smart-link data-htmldiff-id="SPEC-2">SPEC-2</smart-link></td><td><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link> <smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link> <smart-link data-htmldiff-id="REQ-4">REQ-4</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="SPEC-3"><smart-link data-htmldiff-id="SPEC-3">SPEC-3</smart-link></td><td><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link> <smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link> <smart-link data-htmldiff-id="REQ-4">REQ-4</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="SPEC-2"><smart-link data-htmldiff-id="SPEC-2">SPEC-2</smart-link></td><td><smart-link data-htmldiff-id="REQ-1">REQ-1</smart-link> <smart-link data-htmldiff-id="REQ-2">REQ-2</smart-link> <smart-link data-htmldiff-id="REQ-4">REQ-4</smart-link></td></tr></tbody></table></div>');
        });

        it("diffs the row of an item whose content all changed", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td><td>a</td><td>x</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td><td>c</td><td>z</td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td>b</td><td>y</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td><td><del data-operation-index="0">a</del><ins data-operation-index="0">c</ins></td><td><del data-operation-index="0">x</del><ins data-operation-index="0">z</ins></td></tr><tr class="table-row-added"><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td><td>b</td><td>y</td></tr></tbody></table></div>');
        });

        it("keeps same shaped groups of different items apart", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="UC-41" rowspan="2"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="VAL-4"><smart-link data-htmldiff-id="VAL-4">VAL-4</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="PRODREQ-193" rowspan="2"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="COMP-2"><smart-link data-htmldiff-id="COMP-2">COMP-2</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="UC-41" rowspan="2"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="VAL-4"><smart-link data-htmldiff-id="VAL-4">VAL-4</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="PRODREQ-193" rowspan="2"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="COMP-2"><smart-link data-htmldiff-id="COMP-2">COMP-2</smart-link></td></tr></tbody></table></div>');
        });

        it("marks a gained trace as an added cell under its source and deletes the other source whole", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="UC-30"><smart-link data-htmldiff-id="UC-30">UC-30</smart-link></td><td data-htmldiff-id="UREQ-114"><smart-link data-htmldiff-id="UREQ-114">UREQ-114</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="UC-39" rowspan="2"><smart-link data-htmldiff-id="UC-39">UC-39</smart-link></td><td data-htmldiff-id="UREQ-116"><smart-link data-htmldiff-id="UREQ-116">UREQ-116</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="UREQ-312"><smart-link data-htmldiff-id="UREQ-312">UREQ-312</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="UC-30" rowspan="2"><smart-link data-htmldiff-id="UC-30">UC-30</smart-link></td><td data-htmldiff-id="UREQ-114"><smart-link data-htmldiff-id="UREQ-114">UREQ-114</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="UREQ-312"><smart-link data-htmldiff-id="UREQ-312">UREQ-312</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="UC-30" rowspan="2"><smart-link data-htmldiff-id="UC-30">UC-30</smart-link></td><td data-htmldiff-id="UREQ-114"><smart-link data-htmldiff-id="UREQ-114">UREQ-114</smart-link></td></tr><tr><td data-htmldiff-id="UREQ-312" class="table-cell-added"><smart-link data-htmldiff-id="UREQ-312">UREQ-312</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="UC-39" rowspan="2"><smart-link data-htmldiff-id="UC-39">UC-39</smart-link></td><td data-htmldiff-id="UREQ-116"><smart-link data-htmldiff-id="UREQ-116">UREQ-116</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="UREQ-312"><smart-link data-htmldiff-id="UREQ-312">UREQ-312</smart-link></td></tr></tbody></table></div>');
        });

        it("marks a lost trace as a deleted cell under the kept rows of its group", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-15" rowspan="3"><smart-link data-htmldiff-id="SPEC-15">SPEC-15</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-4"><smart-link data-htmldiff-id="TC-4">TC-4</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-15" rowspan="2"><smart-link data-htmldiff-id="SPEC-15">SPEC-15</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="SPEC-15" rowspan="3"><smart-link data-htmldiff-id="SPEC-15">SPEC-15</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr><tr><td data-htmldiff-id="TC-4" class="table-cell-deleted"><smart-link data-htmldiff-id="TC-4">TC-4</smart-link></td></tr></tbody></table></div>');
        });

        it("moves a lost trace under the kept rows of its group", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-15" rowspan="3"><smart-link data-htmldiff-id="SPEC-15">SPEC-15</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-15" rowspan="2"><smart-link data-htmldiff-id="SPEC-15">SPEC-15</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="SPEC-15" rowspan="3"><smart-link data-htmldiff-id="SPEC-15">SPEC-15</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr><tr><td data-htmldiff-id="TC-2" class="table-cell-deleted"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr></tbody></table></div>');
        });

        it("moves the merged cell onto the first kept row when the first row of its group is deleted", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-3" rowspan="3"><smart-link data-htmldiff-id="SPEC-3">SPEC-3</smart-link></td><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-5"><smart-link data-htmldiff-id="TC-5">TC-5</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="SPEC-3" rowspan="2"><smart-link data-htmldiff-id="SPEC-3">SPEC-3</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="TC-5"><smart-link data-htmldiff-id="TC-5">TC-5</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="SPEC-3" rowspan="3"><smart-link data-htmldiff-id="SPEC-3">SPEC-3</smart-link></td><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr><tr><td data-htmldiff-id="TC-5"><smart-link data-htmldiff-id="TC-5">TC-5</smart-link></td></tr><tr><td data-htmldiff-id="TC-2" class="table-cell-deleted"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr></tbody></table></div>');
        });

        it("spans the item over its lost traces when the group shrinks to one row", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="TR-3" rowspan="3"><smart-link data-htmldiff-id="TR-3">TR-3</smart-link></td><td data-htmldiff-id="VER-213"><smart-link data-htmldiff-id="VER-213">VER-213</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="VER-214"><smart-link data-htmldiff-id="VER-214">VER-214</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="VER-211"><smart-link data-htmldiff-id="VER-211">VER-211</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="TR-3"><smart-link data-htmldiff-id="TR-3">TR-3</smart-link></td><td data-htmldiff-id="VER-211"><smart-link data-htmldiff-id="VER-211">VER-211</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="TR-3" rowspan="3"><smart-link data-htmldiff-id="TR-3">TR-3</smart-link></td><td data-htmldiff-id="VER-211"><smart-link data-htmldiff-id="VER-211">VER-211</smart-link></td></tr><tr><td data-htmldiff-id="VER-213" class="table-cell-deleted"><smart-link data-htmldiff-id="VER-213">VER-213</smart-link></td></tr><tr><td data-htmldiff-id="VER-214" class="table-cell-deleted"><smart-link data-htmldiff-id="VER-214">VER-214</smart-link></td></tr></tbody></table></div>');
        });

        it("moves the merged cell onto the first kept row when the first row of its group is added", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="2"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="3"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-0"><smart-link data-htmldiff-id="TC-0">TC-0</smart-link></td></tr><tr><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="3"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr><tr><td data-htmldiff-id="TC-0" class="table-cell-added"><smart-link data-htmldiff-id="TC-0">TC-0</smart-link></td></tr></tbody></table></div>');
        });

        it("moves a gained trace under the kept rows of its group", () => {
            const res = diff('<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="2"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="3"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-2"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="SPEC-1" rowspan="3"><smart-link data-htmldiff-id="SPEC-1">SPEC-1</smart-link></td><td data-htmldiff-id="TC-1"><smart-link data-htmldiff-id="TC-1">TC-1</smart-link></td></tr><tr><td data-htmldiff-id="TC-3"><smart-link data-htmldiff-id="TC-3">TC-3</smart-link></td></tr><tr><td data-htmldiff-id="TC-2" class="table-cell-added"><smart-link data-htmldiff-id="TC-2">TC-2</smart-link></td></tr></tbody></table></div>');
        });

        it("alternates replaced rows", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="UC-41"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="UC-42"><smart-link data-htmldiff-id="UC-42">UC-42</smart-link></td><td data-htmldiff-id="VAL-5"><smart-link data-htmldiff-id="VAL-5">VAL-5</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="PRODREQ-193"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="PRODREQ-194"><smart-link data-htmldiff-id="PRODREQ-194">PRODREQ-194</smart-link></td><td data-htmldiff-id="COMP-2"><smart-link data-htmldiff-id="COMP-2">COMP-2</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="UC-41"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="PRODREQ-193"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="UC-42"><smart-link data-htmldiff-id="UC-42">UC-42</smart-link></td><td data-htmldiff-id="VAL-5"><smart-link data-htmldiff-id="VAL-5">VAL-5</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="PRODREQ-194"><smart-link data-htmldiff-id="PRODREQ-194">PRODREQ-194</smart-link></td><td data-htmldiff-id="COMP-2"><smart-link data-htmldiff-id="COMP-2">COMP-2</smart-link></td></tr></tbody></table></div>');
        });

        it("alternates replaced groups whole", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="UC-41" rowspan="2"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="VAL-4"><smart-link data-htmldiff-id="VAL-4">VAL-4</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="UC-42"><smart-link data-htmldiff-id="UC-42">UC-42</smart-link></td><td data-htmldiff-id="VAL-5"><smart-link data-htmldiff-id="VAL-5">VAL-5</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="PRODREQ-193" rowspan="2"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="COMP-2"><smart-link data-htmldiff-id="COMP-2">COMP-2</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="PRODREQ-194"><smart-link data-htmldiff-id="PRODREQ-194">PRODREQ-194</smart-link></td><td data-htmldiff-id="COMP-3"><smart-link data-htmldiff-id="COMP-3">COMP-3</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="UC-41" rowspan="2"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="VAL-4"><smart-link data-htmldiff-id="VAL-4">VAL-4</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="PRODREQ-193" rowspan="2"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="COMP-2"><smart-link data-htmldiff-id="COMP-2">COMP-2</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="UC-42"><smart-link data-htmldiff-id="UC-42">UC-42</smart-link></td><td data-htmldiff-id="VAL-5"><smart-link data-htmldiff-id="VAL-5">VAL-5</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="PRODREQ-194"><smart-link data-htmldiff-id="PRODREQ-194">PRODREQ-194</smart-link></td><td data-htmldiff-id="COMP-3"><smart-link data-htmldiff-id="COMP-3">COMP-3</smart-link></td></tr></tbody></table></div>');
        });

        it("appends rows left over after alternating", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="UC-41"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr>' +
                '<tr><td data-htmldiff-id="UC-42"><smart-link data-htmldiff-id="UC-42">UC-42</smart-link></td><td data-htmldiff-id="VAL-5"><smart-link data-htmldiff-id="VAL-5">VAL-5</smart-link></td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="PRODREQ-193"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="UC-41"><smart-link data-htmldiff-id="UC-41">UC-41</smart-link></td><td data-htmldiff-id="VAL-3"><smart-link data-htmldiff-id="VAL-3">VAL-3</smart-link></td></tr><tr class="table-row-added"><td data-htmldiff-id="PRODREQ-193"><smart-link data-htmldiff-id="PRODREQ-193">PRODREQ-193</smart-link></td><td data-htmldiff-id="COMP-1"><smart-link data-htmldiff-id="COMP-1">COMP-1</smart-link></td></tr><tr class="table-row-deleted"><td data-htmldiff-id="UC-42"><smart-link data-htmldiff-id="UC-42">UC-42</smart-link></td><td data-htmldiff-id="VAL-5"><smart-link data-htmldiff-id="VAL-5">VAL-5</smart-link></td></tr></tbody></table></div>');
        });
    });

    describe("columns", () => {
        it("marks added column on its cells", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td></tr>' +
                '<tr><td></td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>X</td></tr>' +
                '<tr><td></td><td>Y</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td class="table-cell-added">X</td></tr>' +
                '<tr><td></td><td class="table-cell-added">Y</td></tr></tbody>' +
                '</table>');
        });

        it("marks column inserted in the middle", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>n</td><td>b</td></tr>' +
                '<tr><td>c</td><td>m</td><td>d</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td class="table-cell-added">n</td><td>b</td></tr>' +
                '<tr><td>c</td><td class="table-cell-added">m</td><td>d</td></tr></tbody>' +
                '</table>');
        });

        it("marks added column and added row together", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td></tr>' +
                '<tr><td>c</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr>' +
                '<tr><td>e</td><td>f</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td class="table-cell-added">b</td></tr>' +
                '<tr><td>c</td><td class="table-cell-added">d</td></tr>' +
                '<tr class="table-row-added"><td>e</td><td>f</td></tr></tbody>' +
                '</table>');
        });

        it("adds placeholder for added column in deleted row", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td></tr>' +
                '<tr><td>c</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td class="table-cell-added">b</td></tr>' +
                '<tr class="table-row-deleted"><td>c</td><td class="table-cell-added"></td></tr></tbody>' +
                '</table>');
        });

        it("marks replaced column as deleted and added", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td><td>c</td></tr>' +
                '<tr><td>d</td><td>e</td><td>f</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td><td>1</td><td>c</td></tr>' +
                '<tr><td>d</td><td>2</td><td>f</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td class="table-cell-deleted">b</td><td class="table-cell-added">1</td><td>c</td></tr>' +
                '<tr><td>d</td><td class="table-cell-deleted">e</td><td class="table-cell-added">2</td><td>f</td></tr></tbody>' +
                '</table>');
        });

        it("keeps a column paired when rows were added around its values", () => {
            const res = diff('<table><tbody>' +
                '<tr><td></td><td></td><td></td><td></td></tr>' +
                '<tr><td>jkvbijk ihv</td><td>jkbkj</td><td>kjbkj</td><td>jbkj</td></tr>' +
                '<tr><td>n m kj</td><td>kj jhk</td><td>kj kj</td><td>,m kjn kj kjbkjb kj</td></tr>' +
                '<tr><td></td><td></td><td></td><td></td></tr></tbody></table>',
                '<table><tbody>' +
                '<tr><td>asdvasdv</td><td>savsdv</td><td></td></tr>' +
                '<tr><td>asdvsdv</td><td>sdvasdv</td><td>sdvsdv</td></tr>' +
                '<tr><td>jkvbijk ihv</td><td>kjbkj</td><td>jbkj</td></tr>' +
                '<tr><td>n m kj</td><td>kj kj</td><td>,m kjn kj kjbkjb kj</td></tr>' +
                '<tr><td></td><td>sdvsadv</td><td></td></tr></tbody></table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td><ins data-operation-index="0">asdvasdv</ins></td><td class="table-cell-deleted"></td><td><ins data-operation-index="0">savsdv</ins></td><td></td></tr>' +
                '<tr class="table-row-added"><td>asdvsdv</td><td class="table-cell-deleted"></td><td>sdvasdv</td><td>sdvsdv</td></tr>' +
                '<tr><td>jkvbijk ihv</td><td class="table-cell-deleted">jkbkj</td><td>kjbkj</td><td>jbkj</td></tr>' +
                '<tr><td>n m kj</td><td class="table-cell-deleted">kj jhk</td><td>kj kj</td><td>,m kjn kj kjbkjb kj</td></tr>' +
                '<tr><td></td><td class="table-cell-deleted"></td><td><ins data-operation-index="0">sdvsadv</ins></td><td></td></tr></tbody></table>');
        });

        it("marks moved column as deleted and added", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>b</td><td>a</td></tr>' +
                '<tr><td>d</td><td>c</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td class="table-cell-deleted">a</td><td>b</td><td class="table-cell-added">a</td></tr>' +
                '<tr><td class="table-cell-deleted">c</td><td>d</td><td class="table-cell-added">c</td></tr></tbody>' +
                '</table>');
        });

        it("matches columns by header when cells changed", () => {
            const res = diff(
                '<table><thead>' +
                '<tr><th>Name</th><th>Status</th></tr></thead><tbody>' +
                '<tr><td>a</td><td>open</td></tr></tbody>' +
                '</table>',
                '<table><thead>' +
                '<tr><th>Name</th><th>Status</th></tr></thead><tbody>' +
                '<tr><td>a</td><td>done</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><thead>' +
                '<tr><th>Name</th><th>Status</th></tr></thead><tbody>' +
                '<tr><td>a</td><td>' +
                '<del data-operation-index="0">open</del>' +
                '<ins data-operation-index="0">done</ins></td></tr></tbody>' +
                '</table>');
        });

        it("marks the deleted column on its col", () => {
            const res = diff(
                '<table><colgroup><col style="width: 40%;" /><col style="width: 60%;" /></colgroup><tbody>' +
                '<tr><td>a</td><td>b</td></tr></tbody>' +
                '</table>',
                '<table><colgroup><col style="width: 100%;" /></colgroup><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><colgroup><col style="width: 100%;" /><col style="width: 60%;" class="table-cell-deleted" /></colgroup><tbody>' +
                '<tr><td>a</td><td class="table-cell-deleted">b</td></tr></tbody>' +
                '</table>');
        });

        it("marks deleted column and added row together", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>a</td></tr>' +
                '<tr><td>c</td></tr>' +
                '<tr><td>e</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>a</td><td class="table-cell-deleted">b</td></tr>' +
                '<tr><td>c</td><td class="table-cell-deleted">d</td></tr>' +
                '<tr class="table-row-added"><td>e</td><td class="table-cell-deleted"></td></tr></tbody>' +
                '</table>');
        });
    });

    describe("merged cells", () => {
        it("diffs cells by position when the shape is unchanged", () => {
            const res = diff(
                '<table><thead>' +
                '<tr><th colspan="2">Category</th><th>Zone 1</th><th>Total</th></tr></thead><tbody>' +
                '<tr><td rowspan="2">Before</td><td>Number of</td><td>3</td><td>4</td></tr>' +
                '<tr><td>Risk percentage</td><td>75%</td><td>100%</td></tr></tbody>' +
                '</table>',
                '<table><thead>' +
                '<tr><th colspan="2">Category</th><th>Zone 1</th><th>Total</th></tr></thead><tbody>' +
                '<tr><td rowspan="2">Before</td><td>Number of</td><td>3</td><td>5</td></tr>' +
                '<tr><td>Risk percentage</td><td>60%</td><td>100%</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><thead>' +
                '<tr><th colspan="2">Category</th><th>Zone 1</th><th>Total</th></tr></thead><tbody>' +
                '<tr><td rowspan="2">Before</td><td>Number of</td><td>3</td><td>' +
                '<del data-operation-index="0">4</del>' +
                '<ins data-operation-index="0">5</ins></td></tr>' +
                '<tr><td>Risk percentage</td><td>' +
                '<del data-operation-index="0">75%</del>' +
                '<ins data-operation-index="0">60%</ins></td><td>100%</td></tr></tbody>' +
                '</table>');
        });

        it("marks added body row under a merged header", () => {
            const res = diff(
                '<table><thead>' +
                '<tr><th colspan="2">Risks</th><th>Zone</th></tr></thead><tbody>' +
                '<tr><td>R-1</td><td>a</td><td>1</td></tr></tbody>' +
                '</table>',
                '<table><thead>' +
                '<tr><th colspan="2">Risks</th><th>Zone</th></tr></thead><tbody>' +
                '<tr><td>R-1</td><td>a</td><td>1</td></tr>' +
                '<tr><td>R-2</td><td>b</td><td>2</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><thead>' +
                '<tr><th colspan="2">Risks</th><th>Zone</th></tr></thead><tbody>' +
                '<tr><td>R-1</td><td>a</td><td>1</td></tr>' +
                '<tr class="table-row-added"><td>R-2</td><td>b</td><td>2</td></tr></tbody>' +
                '</table>');
        });

        // merged cells are layout in a text: a table whose merged cells changed is another table
        it("wraps a rich text table whole when a cell was split", () => {
            const oldTable = '<table><tbody><tr><td colspan="2">a</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';
            const newTable = '<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>';
            const res = diff(oldTable, newTable);
            expect(res).to.equal(
                `<del data-operation-index="0">${oldTable.replace("<table>", '<table data-htmldiff-id="redline-table-deleted-0">')}</del>` +
                `<ins data-operation-index="0">${newTable.replace("<table>", '<table data-htmldiff-id="redline-table-added-1">')}</ins>`);
        });

        it("wraps a rich text table whole when cells were merged", () => {
            const oldTable = '<table><tbody><tr><td>Brake</td><td>Press</td></tr><tr><td>Steering</td><td>Turn</td></tr><tr><td>Horn</td><td>Press center</td></tr></tbody></table>';
            const newTable = '<table><tbody><tr><td>Brake</td><td>Press</td></tr><tr><td rowspan="2">Steering<br>Horn</td><td>Turn</td></tr><tr><td>Press center</td></tr></tbody></table>';
            const res = diff(oldTable, newTable);
            expect(res).to.equal(
                `<del data-operation-index="0">${oldTable.replace("<table>", '<table data-htmldiff-id="redline-table-deleted-0">')}</del>` +
                `<ins data-operation-index="0">${newTable.replace("<table>", '<table data-htmldiff-id="redline-table-added-1">')}</ins>`);
        });

        it("wraps a rich text table whole when a group lost a row", () => {
            const oldTable = '<table><tbody><tr><td rowspan="3">g</td><td>a1</td></tr><tr><td>a2</td></tr><tr><td>a3</td></tr></tbody></table>';
            const newTable = '<table><tbody><tr><td rowspan="2">g</td><td>a1</td></tr><tr><td>a3</td></tr></tbody></table>';
            const res = diff(oldTable, newTable);
            expect(res).to.equal(
                `<del data-operation-index="0">${oldTable.replace("<table>", '<table data-htmldiff-id="redline-table-deleted-0">')}</del>` +
                `<ins data-operation-index="0">${newTable.replace("<table>", '<table data-htmldiff-id="redline-table-added-1">')}</ins>`);
        });

        it("wraps a rich text table whole when a title grew over an added column", () => {
            const oldTable = '<table><tbody><tr><td colspan="2">title</td></tr><tr><td>a</td><td>b</td></tr></tbody></table>';
            const newTable = '<table><tbody><tr><td colspan="3">title</td></tr><tr><td>a</td><td>x</td><td>b</td></tr></tbody></table>';
            const res = diff(oldTable, newTable);
            expect(res).to.equal(
                `<del data-operation-index="0">${oldTable.replace("<table>", '<table data-htmldiff-id="redline-table-deleted-0">')}</del>` +
                `<ins data-operation-index="0">${newTable.replace("<table>", '<table data-htmldiff-id="redline-table-added-1">')}</ins>`);
        });

        it("still merges a keyed table when a group lost a row", () => {
            const res = diff(
                '<div><table><tbody><tr><td rowspan="3" data-htmldiff-id="g">g</td><td data-htmldiff-id="a1">a1</td></tr><tr><td data-htmldiff-id="a2">a2</td></tr><tr><td data-htmldiff-id="a3">a3</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td rowspan="2" data-htmldiff-id="g">g</td><td data-htmldiff-id="a1">a1</td></tr><tr><td data-htmldiff-id="a3">a3</td></tr></tbody></table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr><td data-htmldiff-id="g" rowspan="3">g</td><td data-htmldiff-id="a1">a1</td></tr><tr><td data-htmldiff-id="a3">a3</td></tr><tr><td data-htmldiff-id="a2" class="table-cell-deleted">a2</td></tr></tbody></table></div>');
        });

        it("keeps colspan of title row unchanged on merge", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td colspan="3">title</td></tr>' +
                '<tr><td>a</td><td>b</td><td>c</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td colspan="3">title</td></tr>' +
                '<tr><td>a</td><td>b</td><td>c</td></tr>' +
                '<tr><td>d</td><td>e</td><td>f</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td colspan="3">title</td></tr>' +
                '<tr><td>a</td><td>b</td><td>c</td></tr>' +
                '<tr class="table-row-added"><td>d</td><td>e</td><td>f</td></tr></tbody>' +
                '</table>');
        });

        it("keeps rowspan when a row is added below the group", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td rowspan="2">g</td><td>a</td></tr>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td rowspan="2">g</td><td>a</td></tr>' +
                '<tr><td>b</td></tr>' +
                '<tr><td>x</td><td>y</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td rowspan="2">g</td><td>a</td></tr>' +
                '<tr><td>b</td></tr>' +
                '<tr class="table-row-added"><td>x</td><td>y</td></tr></tbody>' +
                '</table>');
        });

        it("keeps rowspan of a deleted group in a keyed table", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td rowspan="2" data-htmldiff-id="g">g</td><td data-htmldiff-id="a">a</td></tr>' +
                '<tr><td data-htmldiff-id="b">b</td></tr>' +
                '<tr><td data-htmldiff-id="x">x</td><td data-htmldiff-id="y">y</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td data-htmldiff-id="x">x</td><td data-htmldiff-id="y">y</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal('<div><table data-htmldiff-id="redline-table-0"><tbody><tr class="table-row-deleted"><td data-htmldiff-id="g" rowspan="2">g</td><td data-htmldiff-id="a">a</td></tr><tr class="table-row-deleted"><td data-htmldiff-id="b">b</td></tr><tr><td data-htmldiff-id="x">x</td><td data-htmldiff-id="y">y</td></tr></tbody></table></div>');
        });

        it("wraps a rich text table whole when a group was deleted", () => {
            const oldTable = '<table><tbody><tr><td rowspan="2">g</td><td>a</td></tr><tr><td>b</td></tr><tr><td>x</td><td>y</td></tr></tbody></table>';
            const newTable = '<table><tbody><tr><td>x</td><td>y</td></tr></tbody></table>';
            const res = diff(oldTable, newTable);
            expect(res).to.equal(
                `<del data-operation-index="0">${oldTable.replace("<table>", '<table data-htmldiff-id="redline-table-deleted-0">')}</del>` +
                `<ins data-operation-index="0">${newTable.replace("<table>", '<table data-htmldiff-id="redline-table-added-1">')}</ins>`);
        });

        it("keeps merged cells when a body row is added under them", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td rowspan="2">Before</td><td>Number of</td><td>3</td></tr>' +
                '<tr><td>Risk percentage</td><td>75%</td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td rowspan="2">Before</td><td>Number of</td><td>3</td></tr>' +
                '<tr><td>Risk percentage</td><td>75%</td></tr>' +
                '<tr><td>After</td><td>Number of</td><td>4</td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td rowspan="2">Before</td><td>Number of</td><td>3</td></tr>' +
                '<tr><td>Risk percentage</td><td>75%</td></tr>' +
                '<tr class="table-row-added"><td>After</td><td>Number of</td><td>4</td></tr></tbody>' +
                '</table>');
        });
    });

    describe("tables", () => {
        it("wraps table present in one version whole", () => {
            const res = diff('<div><p>x</p></div>',
                '<div><p>x</p><table><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div><p>x</p>' +
                '<ins data-operation-index="1"><table data-htmldiff-id="redline-table-added-0"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></ins></div>');
        });

        it("pairs tables by content when one is removed", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table><table><tbody>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td>b</td><td>x</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div>' +
                '<del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-0"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></del><table data-htmldiff-id="redline-table-1"><tbody>' +
                '<tr><td>b</td><td class="table-cell-added">x</td></tr></tbody>' +
                '</table></div>');
        });

        it("wraps tables whole when none share content", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table><table><tbody>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td>x</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div>' +
                '<del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-0"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></del>' +
                '<del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-1"><tbody>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table></del>' +
                '<ins data-operation-index="1"><table data-htmldiff-id="redline-table-added-2"><tbody>' +
                '<tr><td>x</td></tr></tbody>' +
                '</table></ins></div>');
        });

        it("wraps replaced table whole", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td>x</td><td>y</td><td>z</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div>' +
                '<del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-0"><tbody>' +
                '<tr><td>a</td><td>b</td></tr>' +
                '<tr><td>c</td><td>d</td></tr></tbody>' +
                '</table></del>' +
                '<ins data-operation-index="1"><table data-htmldiff-id="redline-table-added-1"><tbody>' +
                '<tr><td>x</td><td>y</td><td>z</td></tr></tbody>' +
                '</table></ins></div>');
        });

        it("wraps a rewritten table with the same columns whole", () => {
            const res = diff('<div><table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table></div>',
                '<div><table><tbody><tr><td>x</td><td>y</td></tr><tr><td>z</td><td>w</td></tr></tbody></table></div>');
            expect(res).to.equal(
                '<div><del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-0"><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table></del>' +
                '<ins data-operation-index="1"><table data-htmldiff-id="redline-table-added-1"><tbody><tr><td>x</td><td>y</td></tr><tr><td>z</td><td>w</td></tr></tbody></table></ins></div>');
        });

        it("wraps replaced table whole when one value happens to match", () => {
            const res = diff(
                '<div><table><tbody>' +
                '<tr><td>a</td><td>b</td><td>same</td></tr>' +
                '<tr><td>c</td><td>d</td><td>e</td></tr></tbody>' +
                '</table></div>',
                '<div><table><tbody>' +
                '<tr><td></td><td></td><td>same</td><td></td><td></td></tr>' +
                '<tr><td>x</td><td></td><td></td><td>y</td><td></td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div>' +
                '<del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-0"><tbody>' +
                '<tr><td>a</td><td>b</td><td>same</td></tr>' +
                '<tr><td>c</td><td>d</td><td>e</td></tr></tbody>' +
                '</table></del>' +
                '<ins data-operation-index="1"><table data-htmldiff-id="redline-table-added-1"><tbody>' +
                '<tr><td></td><td></td><td>same</td><td></td><td></td></tr>' +
                '<tr><td>x</td><td></td><td></td><td>y</td><td></td></tr></tbody>' +
                '</table></ins></div>');
        });

        it("wraps keyed tables whole when their headers differ", () => {
            const headed = (header: string, item: string): string =>
                `<div><table><thead><tr><th>${header}</th><th>Executed Test Case</th></tr></thead><tbody><tr><td data-htmldiff-id="${item}">${item}</td><td>TC-4</td></tr></tbody></table></div>`;
            const res = diff(headed("Test run", "TR-4"), headed("Items", "SPEC-2"));
            expect(res).to.equal('<div><del data-operation-index="1"><table data-htmldiff-id="redline-table-deleted-0"><thead><tr><th>Test run</th><th>Executed Test Case</th></tr></thead><tbody><tr><td data-htmldiff-id="TR-4">TR-4</td><td>TC-4</td></tr></tbody></table></del><ins data-operation-index="1"><table data-htmldiff-id="redline-table-added-1"><thead><tr><th>Items</th><th>Executed Test Case</th></tr></thead><tbody><tr><td data-htmldiff-id="SPEC-2">SPEC-2</td><td>TC-4</td></tr></tbody></table></ins></div>');
        });

        it("wraps tables whole when only repeated filler values recur", () => {
            const table = (cells: string[][]): string =>
                `<table><tbody>${cells.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
            const oldTable = table([
                ["sdvvsdvsdv", "sd vsdv", "sfv", "sdvsd"],
                ["sd vsdv", "", "sd vsdv", ""],
                ["sdvsd v", "sdvsdvsdv", "sdv sdv", "sdvsdv"],
                ["s dvsdv", "", "sd vsd v", "sdvsdv"],
            ]);
            const newTable = table([
                ["sdvsdvsdv", "sdvsdv", "sdvsdv"],
                ["sdvsdv", "sdvsdv", "sdvsdvsdv"],
            ]);
            const res = diff(`<div>${oldTable}</div>`, `<div>${newTable}</div>`);
            expect(res).to.equal(
                "<div>" +
                    `<del data-operation-index="1">${oldTable.replace("<table>", '<table data-htmldiff-id="redline-table-deleted-0">')}</del>` +
                    `<ins data-operation-index="1">${newTable.replace("<table>", '<table data-htmldiff-id="redline-table-added-1">')}</ins>` +
                    "</div>",
            );
        });

        it("pairs tables by their own id", () => {
            const res = diff(
                '<div><table data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table><table data-htmldiff-id="REQ-2" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table></div>',
                '<div><table data-htmldiff-id="REQ-2" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>b</td><td>x</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div>' +
                '<del data-operation-index="1"><table data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></del><table data-htmldiff-id="REQ-2"><tbody>' +
                '<tr><td>b</td><td class="table-cell-added">x</td></tr></tbody>' +
                '</table></div>');
        });

        it("never pairs tables with different ids", () => {
            const res = diff(
                '<div><table data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></div>',
                '<div><table data-htmldiff-id="REQ-2" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div>' +
                '<del data-operation-index="1"><table data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></del>' +
                '<ins data-operation-index="1"><table data-htmldiff-id="REQ-2" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></ins></div>');
        });

        it("shows a table with its own id but no inner diff as it is", () => {
            const res = diff(
                '<div><table data-htmldiff-id="REQ-1"><tbody><tr><td>Fire</td></tr></tbody></table></div>',
                '<div><table data-htmldiff-id="REQ-1"><tbody><tr><td>Ice</td></tr></tbody></table></div>',
            );
            expect(res).to.equal('<div><table data-htmldiff-id="REQ-1"><tbody><tr><td>Ice</td></tr></tbody></table></div>');
        });

        it("marks added rows inside table with same id", () => {
            const res = diff(
                '<div><table data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></div>',
                '<div><table data-htmldiff-id="REQ-1" data-htmldiff-inner-diff="true"><tbody>' +
                '<tr><td>a</td></tr>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table></div>');
            expect(res).to.equal(
                '<div><table data-htmldiff-id="REQ-1"><tbody>' +
                '<tr><td>a</td></tr>' +
                '<tr class="table-row-added"><td>b</td></tr></tbody>' +
                '</table></div>');
        });

        it("diffs nested table as cell content", () => {
            const res = diff(
                '<table><tbody>' +
                '<tr><td>x</td><td><table><tbody>' +
                '<tr><td>a</td></tr></tbody>' +
                '</table></td></tr></tbody>' +
                '</table>',
                '<table><tbody>' +
                '<tr><td>x</td><td><table><tbody>' +
                '<tr><td>b</td></tr></tbody>' +
                '</table></td></tr></tbody>' +
                '</table>');
            expect(res).to.equal(
                '<table data-htmldiff-id="redline-table-0"><tbody>' +
                '<tr><td>x</td><td><table><tbody>' +
                '<tr><td>' +
                '<del data-operation-index="1">a</del>' +
                '<ins data-operation-index="1">b</ins></td></tr></tbody>' +
                '</table></td></tr></tbody>' +
                '</table>');
        });
    });

    describe("cell diffs", () => {
        it("passes className and dataPrefix into the cells", () => {
            const res = diff('<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>',
                '<table><tbody><tr><td>a</td><td>c</td></tr></tbody></table>', 'diff-cls', 'pre');
            expect(res).to.equal('<table data-htmldiff-id="redline-table-0"><tbody><tr><td>a</td><td>' +
                '<del data-pre-operation-index="0" class="diff-cls">b</del>' +
                '<ins data-pre-operation-index="0" class="diff-cls">c</ins></td></tr></tbody></table>');
        });
    });
});
