/**
 * Created by josh on 8/11/15.
 */
var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var VirtualDoc = require('./virtualdom');
var Editor = require('../src/editor');
var Keystrokes = require('../src/keystrokes');




test('basic text diff 1',function(t) {
    var diff = Keystrokes.calculateTextDifference('abcdef','abcXdef');
    t.equal(diff.same,false);
    t.equal(diff.newChar,'X');
    t.equal(diff.offset,3);

    var diff = Keystrokes.calculateTextDifference('abcdef','Xabcdef');
    t.equal(diff.same,false);
    t.equal(diff.newChar,'X');
    t.equal(diff.offset,0);


    var diff = Keystrokes.calculateTextDifference('abcdef','abcdefX');
    t.equal(diff.same,false);
    t.equal(diff.newChar,'X');
    t.equal(diff.offset,6);
    t.end();

    var diff = Keystrokes.calculateTextDifference('abcdef','abcdef');
    t.equal(diff.same,true);

});

test('text diff 2', function(t) {
    var diff = Keystrokes.calculateTextDifference("foo ","foo_s");
    console.log("diff is",diff);


    t.equal(diff.same,false);
    t.equal(diff.newString,'_s');
    t.equal(diff.offset,3);
    t.end();
});

test('long paste html spans and text', function(t) {
    //make the model
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block = model.makeBlock();
    block.append(model.makeText('abcdef'));
    model.getRoot().append(block);
    //Model.print(model);
    editor.syncDom();

    //edit the dom
    //Dom.print(dom_root);
    var dom_text1 = dom_root.childNodes[0].childNodes[0];
    dom_text1.nodeValue = 'abc';
    var dom_span1 = VirtualDoc.createElement('span');
    dom_span1.appendChild(VirtualDoc.createTextNode("XXX"));
    dom_root.childNodes[0].appendChild(dom_span1);
    var dom_span2 = VirtualDoc.createElement('span');
    dom_span2.appendChild(VirtualDoc.createTextNode("def"));
    dom_root.childNodes[0].appendChild(dom_span2);
    //Dom.print(dom_root);

    //calc the range
    var range = {
        start: {
            dom:dom_span1.childNodes[0],
            mod:null,
        }
    }
    var changeRange = Dom.calculateChangeRange(model,dom_root,range.start);

    //console.log('change range is',changeRange.start.dom.id,changeRange.start.mod.id);
    var mod2 = Dom.rebuildModelFromDom(changeRange.start.dom, editor.getModel(), editor.getImportMapping());
    //console.log("new model");
    //Model.print(mod2);

    var oldBlock = changeRange.start.mod;
    var newBlock = mod2;
    var chg = Keystrokes.makeReplaceBlockChange(oldBlock.getParent(),oldBlock.getIndex(),newBlock);
    editor.applyChange(chg);

    //Model.print(editor.getModel());

    t.equal(editor.getModel().toPlainText(),'abcXXXdef');

    t.end();
});


