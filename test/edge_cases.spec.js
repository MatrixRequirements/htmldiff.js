const diff = require('../js/htmldiff');

describe('Edge cases', () => {
    it('removes deleted closing-opening tag pair', () => {
        const before = `<div><p><img src="img1.jpg" /></p><p><img src="img2.jpg" /></p><p>something</p></div>`;
        const after = `<div><p><img src="img1.jpg" /><img src="img2.jpg" /></p><p>something</p></div>`;
        const res = `<div><p><img src="img1.jpg" /><del></del><img src="img2.jpg" /></p><p>something</p></div>`;

        expect(diff(before, after)).to.eql(res);
    });

    it('preserves new lines', () => {
        const before = `<div>this isain text control Donec ullamcorper tortor quis augue egestas ultricies. Aenean vehicula molestie ex. Praesent id dolor at mauris efficitur ultrices. Vestibulum rutrum sit amet odio quis gravida. Praesent id augue maximus, faucibus tellus in, mattis augue. Pellentesque ullamcorper, ante et vestibulum tempus, libero nisl consequat massa, vel aliquam massa nibh in sapie</div>`;
        const after = `<div>this isain text control Donec ullamcorper tortor quis augue egestas ultricies. Aenean vehicula molestie ex. Praesent id do at mauris efficitur ultrices. Vestibulum rutrum sit amet odio quis gravida. Praesent id augue maximus, faucibus tellus in, mattisugue. Pellentesque ullamcorper, ante et  tempus, libero nisl consequat massa, vel aliquam massa nibh 

jndfoewnf[owe 1123123242
%^&amp;*()(*&amp;^%$#@#$%^&amp;*()

BNXOISAN'FOSER3154
65+
5SSDC</div>`;
        const res = `<div>this isain text control Donec ullamcorper tortor quis augue egestas ultricies. Aenean vehicula molestie ex. Praesent id <del data-operation-index="1">dolor</del><ins data-operation-index="1">do</ins> at mauris efficitur ultrices. Vestibulum rutrum sit amet odio quis gravida. Praesent id augue maximus, faucibus tellus in, <del data-operation-index="3">mattis augue.</del><ins data-operation-index="3">mattisugue.</ins> Pellentesque ullamcorper, ante et<del data-operation-index="5"> vestibulum</del>  tempus, libero nisl consequat massa, vel aliquam massa nibh<del data-operation-index="7"> in sapie</del><ins data-operation-index="7"> 

jndfoewnf[owe 1123123242
%^&amp;*()(*&amp;^%$#@#$%^&amp;*()

BNXOISAN'FOSER3154
65+
5SSDC</ins></div>`;

        expect(diff(before, after)).to.eql(res);
    })
});