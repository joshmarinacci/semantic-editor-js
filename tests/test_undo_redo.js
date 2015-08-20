var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var VirtualDoc = require('./virtualdom');
var Editor = require('../src/editor');
var Keystrokes = require('../src/keystrokes');

function makeTextSpanText() {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abc");
    block1.append(text1);
    var span = model.makeSpan();
    var text2 = model.makeText('def');
    span.append(text2);
    block1.append(span);
    var text3 = model.makeText('ghi');
    block1.append(text3);
    model.getRoot().append(block1);
    editor.syncDom();
    return editor;
}

test('undo text insert', function(t) {
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var text1 = editor.getModel().getRoot().child(0).child(0);
    Model.print(editor.getModel());
    var range = {
        start: {
            mod: text1,
            offset:1
        }
    };
    t.equals(editor._undostack.length,0);
    t.equals(editor._redostack.length,0);
    editor.setSelectionAtDocumentOffset(1,1,false);
    Keystrokes.splitLine(null,editor);

    t.equals(editor._undostack.length,1);
    t.equals(editor._redostack.length,0);
    t.equal(editor.getModel().getRoot().childCount(),2);
    Model.print(editor.getModel());
    editor.undoChange();
    Model.print(editor.getModel());
    t.equals(editor._undostack.length,0);
    t.equals(editor._redostack.length,1);
    t.equal(editor.getModel().getRoot().childCount(),1);

    editor.redoChange();
    Model.print(editor.getModel());
    t.equals(editor._undostack.length,1);
    t.equals(editor._redostack.length,0);
    t.equal(editor.getModel().getRoot().childCount(),2);


    editor.undoChange();
    Model.print(editor.getModel());
    t.equals(editor._undostack.length,0);
    t.equals(editor._redostack.length,1);
    t.equal(editor.getModel().getRoot().childCount(),1);

    t.end();

});

function findDomTextAtOffset(node, off) {
    //console.log("looking at",node.id,off);
    if(node.nodeType == Dom.Node.ELEMENT_NODE) {
        for(var i=0; i<node.childNodes.length; i++) {
            var ret = findDomTextAtOffset(node.childNodes[i],off);
            if(ret[0] === true) return ret;
            off = ret[2];
        }
        return [false, null, off];
    }
    if(node.nodeType == Dom.Node.TEXT_NODE) {
        if(node.nodeValue.length > off) {
            //console.log("found it",off,node.nodeValue.length);
            return [true,  node, off];
        } else {
            //console.log("no found",off,node.nodeValue.length);
            return [false, node, off-node.nodeValue.length];
        }
    }
}

function makeRange(editor,off1,off2) {
    //Dom.print(editor.getDomRoot());
    var s = findDomTextAtOffset(editor.getDomRoot(),off1);
    var e = findDomTextAtOffset(editor.getDomRoot(),off2);
    //console.log("id = ",s[1].nodeValue,s[2]);
    //console.log("id = ",e[1].nodeValue,e[2]);
    return {
        start: {
            dom: s[1],
            mod: Dom.findModelForDom(editor.getModel(),s[1]),
            offset:s[2]
        },
        end: {
            dom: e[1],
            mod: Dom.findModelForDom(editor.getModel(),e[1]),
            offset:e[2]
        }
    }
}

function makeThreeBlocks() {
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
    return editor;
}

test('block style change', function(t) {
    var editor = makeThreeBlocks();
    t.equals(editor.getModel().getRoot().child(1).style,'body');
    editor.setSelectionAtDocumentOffset(8,8,false);
    Keystrokes.changeBlockStyle(null,editor,'header');
    t.equals(editor.getModel().getRoot().child(1).style,'header');
    editor.undoChange();
    t.equals(editor.getModel().getRoot().child(1).style,'body');
    editor.redoChange();
    t.equals(editor.getModel().getRoot().child(1).style,'header');
    t.end();
});

test('multi-line block style change', function(t) {
    var editor = makeThreeBlocks();
    Model.print(editor.getModel());
    t.equals(editor.getModel().getRoot().child(0).style,'body');
    t.equals(editor.getModel().getRoot().child(1).style,'body');
    t.equals(editor.getModel().getRoot().child(2).style,'body');
    editor.setSelectionAtDocumentOffset(5,15,false);
    Keystrokes.changeBlockStyle(null,editor,'header');
    t.equals(editor.getModel().getRoot().child(0).style,'header');
    t.equals(editor.getModel().getRoot().child(1).style,'header');
    t.equals(editor.getModel().getRoot().child(2).style,'header');
    t.end();
});

test("multi-line delete backwards",function(t) {
    var editor = makeThreeBlocks();
    editor.setSelectionAtDocumentOffset(2,15,false);
    t.equals(editor.getModel().getRoot().childCount(),3);
    Keystrokes.deleteBackwards(null,editor);
    t.equals(editor.getModel().getRoot().childCount(),1);
    t.equals(editor.getModel().toPlainText(),'abpqr');
    editor.undoChange();
    t.equals(editor.getModel().getRoot().childCount(),3);
    t.equals(editor.getModel().toPlainText(),'abcdefghijklmnopqr');
    editor.redoChange();
    t.equals(editor.getModel().getRoot().childCount(),1);
    t.equals(editor.getModel().toPlainText(),'abpqr');
    t.end();
});

test("multi-line delete forwards",function(t) {
    var editor = makeThreeBlocks();
    editor.setSelectionAtDocumentOffset(2,15);
    t.equals(editor.getModel().getRoot().childCount(),3);
    Keystrokes.deleteForwards(null,editor);
    t.equals(editor.getModel().getRoot().childCount(),1);
    t.equals(editor.getModel().toPlainText(),'abpqr');
    editor.undoChange();
    t.equals(editor.getModel().getRoot().childCount(),3);
    t.equals(editor.getModel().toPlainText(),'abcdefghijklmnopqr');
    editor.redoChange();
    t.equals(editor.getModel().getRoot().childCount(),1);
    t.equals(editor.getModel().toPlainText(),'abpqr');
    t.end();
});



test("delete backwards at start of doc",function(t) {
    var editor = makeThreeBlocks();
    editor.setSelectionAtDocumentOffset(0,0);
    t.equals(editor.getModel().getRoot().childCount(),3);
    Keystrokes.deleteBackwards(null,editor);
    t.equals(editor.getModel().toPlainText(),'abcdefghijklmnopqr');
    t.end();
});



test('split fwd delete, split fwd delete', function(t) {
    var editor = makeThreeBlocks();
    editor.setSelectionAtDocumentOffset(2,2);
    Keystrokes.splitLine(null,editor);
    t.equals(editor.getModel().getRoot().child(1).child(0).text,'cdef');
    editor.setCursorAtDocumentOffset(2,Model.LEFT_BIAS);
    Keystrokes.deleteForwards(null,editor);
    t.equals(editor.getModel().getRoot().child(0).child(1).text,'def');
    Keystrokes.splitLine(null,editor);
    t.equals(editor.getModel().getRoot().child(1).child(0).text,'');
    editor.setCursorAtDocumentOffset(2,Model.LEFT_BIAS);
    Keystrokes.deleteForwards(null,editor);
    t.equals(editor.getModel().getRoot().child(0).child(1).text,'ef');

    editor.undoChange();
    editor.undoChange();
    editor.undoChange();
    t.equals(editor.getModel().getRoot().child(1).child(0).text,'cdef');
    t.end();
});



test('split, back delete, split, back delete', function(t) {
    var editor = makeThreeBlocks();
    editor.setSelectionAtDocumentOffset(2,2);
    Keystrokes.splitLine(null,editor);
    t.equals(editor.getModel().getRoot().child(1).child(0).text,'cdef');
    editor.setSelectionAtDocumentOffset(2,2);
    Keystrokes.deleteBackwards(null,editor);
    editor.setSelectionAtDocumentOffset(2,2);
    Keystrokes.splitLine(null,editor);
    editor.setSelectionAtDocumentOffset(2,2);
    Keystrokes.deleteBackwards(null,editor);
    t.end();
});

test('backwards delete across multiple text 1', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    blk1.append(model.makeText("def"));
    model.getRoot().append(blk1);
    editor.syncDom();
    editor.setSelectionAtDocumentOffset(3,3);
    Keystrokes.deleteBackwards(null,editor);
    t.equal(model.toPlainText(),'abdef');
    t.end();
});


test('backwards delete across multiple text 2', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    blk1.append(model.makeText("def"));
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();
    editor.setSelectionAtDocumentOffset(2,7);
    Keystrokes.deleteBackwards(null,editor);
    t.equal(model.toPlainText(),'abhi');
    t.end();
});


test('delete across spans',function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.append(model.makeText("def"));
    blk1.append(span);
    blk1.append(model.makeText("ghi"));
    model.append(blk1);
    editor.syncDom();

    editor.setSelectionAtDocumentOffset(2,4);
    Keystrokes.deleteBackwards(null,editor);
    t.equal(model.toPlainText(),'abefghi');
    t.end();
});



test('backwards delete image', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var img = model.makeSpan();
    img.style = 'image';
    img.meta = {
        src:'foo'
    };
    img.append(model.makeText('X'));
    blk1.append(img);
    blk1.append(model.makeText("def"));
    model.getRoot().append(blk1);
    editor.syncDom();

    editor.setSelectionAtDocumentOffset(4,4);
    Keystrokes.deleteBackwards(null,editor);
    t.equal(model.toPlainText(),'abcdef');
    t.end();
});

test('backwards delete in the middle of a long text', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abcdef"));
    model.getRoot().append(blk1);
    editor.syncDom();
    Model.print(model);
    editor.setSelectionAtDocumentOffset(3,3);
    Keystrokes.deleteBackwards(null,editor);
    t.equal(model.toPlainText(),'abdef');
    t.end();

});

test('backwards delete into a span', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.append(model.makeText('def'));
    blk1.append(span);
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();
    Model.print(model);
    editor.setSelectionAtDocumentOffset(6,6);
    console.log("range = ", editor.getSelectionRange().toString())
    Keystrokes.deleteBackwards(null,editor);
    Model.print(model);
    t.equal(model.toPlainText(),'abcdeghi');
    t.end();

});

test('backwards delete within a span', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.append(model.makeText('def'));
    blk1.append(span);
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();
    Model.print(model);
    editor.setSelectionAtDocumentOffset(5,5);
    console.log("range = ", editor.getSelectionRange().toString())
    Keystrokes.deleteBackwards(null,editor);
    Model.print(model);
    t.equal(model.toPlainText(),'abcdfghi');
    t.end();

});

return;
test('delete backwards empty block',function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText('foo'));
    model.getRoot().append(blk1);

    var blk2 = model.makeBlock();
    var span2 = model.makeSpan();
    blk2.append(span2);
    model.getRoot().append(blk2);

    var blk3 = model.makeBlock();
    blk3.append(model.makeText('bar'));
    model.getRoot().append(blk3);

    Model.print(model);

    editor.setSelectionAtDocumentOffset(4,4);
    console.log("range = ", editor.getSelectionRange().toString())
    Keystrokes.deleteBackwards(null,editor);
    t.end();

});