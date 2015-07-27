/**
 * Created by josh on 7/25/15.
 */

var fs = require('fs');
var parser = require('./../sample/markdown_parser');
var doc = require('../src/model');

var md = fs.readFileSync('tests/test.md').toString();
//console.log("markdown = ", md);

var model = parser.parse(md);
//console.log("the model is");
dumpTree(model.getRoot());



function dumpTree(root,indent) {
    if(!indent) indent = "";
    if(root.type == doc.TEXT) {
        var txt = root.text;
        if(txt.length > 100) {
            txt = txt.substring(0,100);
        }
        console.log(indent+root.id+" "+root.type+" '"+txt+"'");
    }else {
        console.log(indent + root.id+" "+root.type+'.'+root.style);
    }
    if(root.content) {
        root.content.forEach(function(node) {
            dumpTree(node,indent + "  ");
        })
    }
}

