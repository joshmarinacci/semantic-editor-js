/**
 * Created by josh on 7/25/15.
 */

var Model = require('../src/model');

var NL = '\n';
exports.parse = function(str) {
    var model = Model.makeModel();


    var prev_ch = null;
    var linestart = true;
    var c_block = model.makeBlock();
    var c_text = null;
    var c_str = "";
    var i = 0;
    function isNext(target) {
        var sub = str.substring(i,i+target.length);
        if(sub == target) return true;
        return false;
    }
    function peek(count) {
        var sub = str.substring(i,i+count);
        return sub;
    }
    function seek(target) {
        var n = str.indexOf(target,i);
        var sub = str.substring(i,n);
        i=n+target.length;
        return sub;
    }
    for(i=0; i<str.length; i++) {


        var ch = str[i];
        if(ch == '#' && linestart === true) {
            c_block.style = 'subheader';
            linestart = false;
            continue;
        }
        var block_code_marker = "```\n";
        var teststr = peek(block_code_marker.length);
        if(teststr == block_code_marker) {
            i+=block_code_marker.length;
            var content = seek(block_code_marker);
            var blk = model.makeBlock();
            blk.append(model.makeText(content));
            blk.style = 'block-code';
            model.getRoot().append(blk);
            c_str = "";
            linestart = true;
            continue;
        }

        if(isNext('![')) {
            console.log("we are doing an image, not a link");
            i+=2;
            var span = model.makeSpan();
            span.style = 'image';
            var skip_id = seek(']');
            var skip_empty = seek('(');
            span.meta = {
                src: seek(')')
            };
            c_block.append(span);
            c_text = null;
            ch = str[i];
            prev_ch = ch;
            if(ch == NL) {
                linestart = true;
                console.log("starting a new line");
            }
            console.log("the current ch = ", ch);
            c_str = "";
            continue;
        }
        if(ch == '[') {
            console.log("starting a link");
            i += 1;
            var text = seek(']');
            console.log("pulled out a link text", text);
            var skip = seek('(');
            var href = seek(')');
            console.log("href = ", href);
            //finish current text
            c_text = model.makeText(c_str);
            c_block.append(c_text);
            var span = model.makeSpan();
            span.style = 'link';
            span.meta = {
                href: href
            };
            c_text = model.makeText(text);
            span.append(c_text);
            c_block.append(span);
            c_text = null;
            ch = str[i];
            c_str = ch;
            prev_ch = ch;
            continue;
        }


        linestart = false;
        if(ch == NL && prev_ch == NL) {
            c_text = model.makeText(c_str);
            c_block.append(c_text);
            model.getRoot().append(c_block);
            c_block = model.makeBlock();
            c_text = null;
            c_str = "";
        }
        prev_ch = ch;
        if(ch == NL) {
            linestart = true;
        }

        c_str += ch;
    }

    //whatevers left gets added
    c_text = model.makeText(c_str);
    c_block.append(c_text);
    model.append(c_block);
    return model;
}