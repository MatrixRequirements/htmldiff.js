const diff = require('../js/htmldiff');

describe('Edge cases', () => {
    it('removes deleted closing-opening tag pair', () => {
        const before = `
            <div>
                <p><img src="img1.jpg" /></p>
                <p><img src="img2.jpg" /></p>
                <p>something</p>
            </div>
        `;
        const after = `
            <div>
                <p>
                    <img src="img1.jpg" />
                    <img src="img2.jpg" />
                </p>
                <p>something</p>
            </div>
        `;
        const res = `
            <div>
                <p><img src="img1.jpg" /><del>
                </del><img src="img2.jpg" /></p>
                <p>something</p>
            </div>
        `;

        expect(diff(before, after)).to.eql(res);
    });
});