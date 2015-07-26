/**
 * Created by josh on 7/25/15.
 */

var Model = require('../src/model');

var NL = '\n';
exports.parse = function(str) {
    var model = Model.makeModel();


    var prev = null;
    var linestart = true;
    var block = "";
    var header = false;
    for(var i=0; i<str.length; i++) {
        var ch = str[i];
        if(ch == '#' && linestart === true) {
            //console.log("starting a header line");
            header = true;
            linestart = false;
            continue;
        }


        linestart = false;
        if(ch == NL && prev == NL) {
            //console.log("insert a block", header,block);
            var blk = model.makeBlock();
            blk.append(model.makeText(block.trim()));
            if(header === true) {
                blk.style = 'subheader';
            }
            model.getRoot().append(blk);
            header = false;
            block = "";
        }
        prev = ch;
        if(ch == NL) {
            linestart = true;
        }

        block += ch;
    }

    //whatevers left gets added
    var blk = model.makeBlock();
    blk.append(model.makeText(block.trim()));
    model.getRoot().append(blk);

    return model;
}