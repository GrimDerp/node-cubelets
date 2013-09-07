var multimeter = require('multimeter');
var multi = new multimeter(process);

console.log('Connected.');

multi.drop(function (bar) {
    var iv = setInterval(function () {
        var p = bar.percent();
        bar.percent(p + 1);

        if (p >= 100) clearInterval(iv);
    }, 25);
});