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

test('editing span from multiple lines', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var block2 = model.makeBlock();
    block2.append(model.makeText("If you've found this site you probably came from one of my technical blogs on "));
    model.append(block2);

    var block4 = model.makeBlock();
    var span5 = model.makeSpan();
    span5.style = 'link';
    span5.append(model.makeText("Java"));
    block4.append(span5);
    model.append(block4);

    var block7 = model.makeBlock();
    block7.append(model.makeText(", "));
    model.append(block7);

    var block9 = model.makeBlock();
    var span10 = model.makeSpan();
    span10.style = 'link';
    span10.append(model.makeText("JavaFX"));
    block9.append(span10);
    model.append(block9);

    var block12 = model.makeBlock();
    block12.append(model.makeText(" or fun "));
    model.append(block12);


    var block14 = model.makeBlock();
    var span15 = model.makeSpan();
    span15.style = 'link';
    span15.append(model.makeText("JavaFX demos"));
    block14.append(span15);
    model.append(block14);

    var block17 = model.makeBlock();
    block17.append(model.makeText(". First let me say: Welcome!"));
    model.append(block17);

    editor.syncDom();
    Model.print(model);


    editor.setSelectionAtDocumentOffset(80,80);
    console.log("range is " + editor.getSelectionRange());


    var dom = Dom.findDomForModel(editor.getSelectionRange().start.mod,editor.getDomRoot());
    //console.log("found the dom",dom);
    //insert 'X'
    dom.nodeValue = 'JaXva';
    Keystrokes.handleInput(null,editor);
    Model.print(model);


    t.equal(model.getRoot().child(1).child(0).child(0).text,'JaXva');
    t.end();
});



test('adding link messes up other spans', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model  = editor.getModel();
    var blk = model.makeBlock();
    blk.append(model.makeText("abc"));
    var span1 = model.makeSpan().append(model.makeText("def")).setStyle('strong');
    blk.append(span1);
    blk.append(model.makeText("ghijkl"));
    model.getRoot().append(blk);
    editor.syncDom();
    editor.setSelectionAtDocumentOffset(8,10);
    var range = editor.getSelectionRange();
    Model.print(model);

    //verify, style link, verify
    t.equal(model.getRoot().child(0).child(1).style,'strong');
    Keystrokes.styleSelection(null,editor,'link');
    t.equal(model.getRoot().child(0).child(1).style,'strong');


    Model.print(model);
    t.end();
});