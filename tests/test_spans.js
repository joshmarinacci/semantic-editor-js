var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var VirtualDoc = require('./virtualdom');
var Editor = require('../src/editor');
var Keystrokes = require('../src/keystrokes');

test('style simple span', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abcdefghi"));
    model.append(blk1);
    editor.syncDom();
    t.equal(model.toPlainText(),'abcdefghi');
    Model.print(model);
    editor.setSelectionAtDocumentOffset(2,5);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);
    t.equal(model.toPlainText(),'abcdefghi');
    t.end();
});

test('style across two text blocks',function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    blk1.append(model.makeText("def"));
    blk1.append(model.makeText("ghi"));
    model.append(blk1);
    editor.syncDom();
    t.equal(model.toPlainText(),'abcdefghi');
    Model.print(model);
    editor.setSelectionAtDocumentOffset(2,5);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);
    t.equal(model.toPlainText(),'abcdefghi');
    t.end();
});

//technically this is correct, since all of the right text is styled
//but we should add future tests to reduce the number of styles

test('style across three text blocks',function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    blk1.append(model.makeText("def"));
    blk1.append(model.makeText("ghi"));
    model.append(blk1);
    editor.syncDom();
    t.equal(model.toPlainText(),'abcdefghi');
    Model.print(model);
    editor.setSelectionAtDocumentOffset(2,7);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);
    t.equal(model.toPlainText(),'abcdefghi');
    t.equal(model.getRoot().child(0).childCount(),5);
    t.end();
});

test("style on span",function(t){
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var strong = model.makeSpan();
    strong.style = 'strong';
    strong.append(model.makeText('def'));
    blk1.append(strong);
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();

    t.equal(model.toPlainText(),'abcdefghi');

    editor.setSelectionAtDocumentOffset(3,6);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Model.print(model);
    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);
    t.equal(model.toPlainText(),'abcdefghi');
    t.end();
});



test("style around span",function(t){
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var strong = model.makeSpan();
    strong.style = 'strong';
    strong.append(model.makeText('def'));
    blk1.append(strong);
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();

    t.equal(model.toPlainText(),'abcdefghi');

    editor.setSelectionAtDocumentOffset(1,7);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Model.print(model);
    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);
    t.equal(model.toPlainText(),'abcdefghi');
    t.end();
});


test("style overlapping span",function(t){
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var strong = model.makeSpan();
    strong.style = 'strong';
    strong.append(model.makeText('def'));
    blk1.append(strong);
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();

    t.equal(model.toPlainText(),'abcdefghi');

    editor.setSelectionAtDocumentOffset(4,7);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Model.print(model);
    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);
    t.equal(model.toPlainText(),'abcdefghi');
    t.end();
});

test("multi-line style 1", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abcdef"));
    model.getRoot().append(blk1);

    var blk2 = model.makeBlock();
    blk2.append(model.makeText("ghijkl"));
    model.getRoot().append(blk2);

    var blk3 = model.makeBlock();
    blk3.append(model.makeText("mnopqr"));
    model.getRoot().append(blk3);
    editor.syncDom();

    editor.setSelectionAtDocumentOffset(2,9);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Model.print(model);


    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);


    t.end();
});

test("multi-line style 2", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abcdef"));
    model.getRoot().append(blk1);

    var blk2 = model.makeBlock();
    blk2.append(model.makeText("ghijkl"));
    model.getRoot().append(blk2);

    var blk3 = model.makeBlock();
    blk3.append(model.makeText("mnopqr"));
    model.getRoot().append(blk3);
    editor.syncDom();

    editor.setSelectionAtDocumentOffset(2,15);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Model.print(model);

    Keystrokes.styleSelection(null,editor,'italic');
    Model.print(model);

    t.equals(model.getRoot().child(0).child(1).child(0).text,'cdef');
    t.equals(model.getRoot().child(1).child(0).style,'italic');

    t.end();
});
