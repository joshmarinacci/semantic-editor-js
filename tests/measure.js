var fs = require('fs');

var paths = [
    'src/dom.js',
    'src/model.js',
    'src/keystrokes.js'
];
var total = 0;
paths.forEach(function(path){
    total += countFile(path)
});
console.log('total is',total);

function countFile(path) {

    var file = fs.readFileSync(path).toString();
    console.log('chars = ', file.length);
    var lines = file.split('\n');
    console.log('lines = ', lines.length);

    var code = lines.filter(function (line) {
        //comments
        if (line.match(/^\s*\/\//)) {
            return false;
        }
        if (line.match(/^\s*$/)) {
            return false;
        }
        return true;
    });

    console.log('code lines = ',code.length);
    return code.length;
}

//1491, start
//1367 july 28th, 2015
//1554 after adding selection restoration and link code


