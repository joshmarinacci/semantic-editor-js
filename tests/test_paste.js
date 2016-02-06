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
    //console.log("diff is",diff);


    t.equal(diff.same,false);
    t.equal(diff.newChar,'s');
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

function makeTestBlocks() {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var texts = ['abc','def','ghi','jkl','mno'];
    texts.forEach(function(text) {
        var block = model.makeBlock();
        block.style = 'header';
        block.append(model.makeText(text));
        model.getRoot().append(block);
    });

    editor.syncDom();
    return editor;
}

function insertPaste(dom_root, n) {
    var div1 = dom_root.childNodes[n];
    var next = dom_root.childNodes[n+1];
    var oldText = div1.childNodes[0].nodeValue;
    div1.childNodes[0].nodeValue = oldText.substring(0,2);
    var span1 = VirtualDoc.createElement('span');
    span1.appendChild(VirtualDoc.createTextNode('XXX'));
    div1.appendChild(span1);
    div1.appendChild(VirtualDoc.createTextNode(' \n '));

    var div2 = VirtualDoc.createElement('div');
    div2.appendChild(VirtualDoc.createElement('br'));
    if(next) {
        dom_root.insertBefore(div2, next);
    } else {
        dom_root.appendChild(div2);
    }


    var div3 = VirtualDoc.createElement('div');
    div3.id = div1.id;
    div3.classList.add('header');
    var span3 = VirtualDoc.createElement('span');
    span3.appendChild(VirtualDoc.createTextNode('YYY'));
    div3.appendChild(span3);
    div3.appendChild(VirtualDoc.createTextNode(oldText.substring(2)));
    if(next) {
        dom_root.insertBefore(div3, next);
    } else {
        dom_root.appendChild(div3);
    }

    var range = {
        start: {
            dom:dom_root.childNodes[n+2].childNodes[0].childNodes[0],
            mod:null
        }
    };
    return range;
}

test("paste multiple paragraphs 1", function(t) {
    var editor = makeTestBlocks();
    var dom_root = editor.getDomRoot();
    var model    = editor.getModel();
    var n = 0;
    var range = insertPaste(dom_root,n);


    //Dom.print(dom_root);
    var pdom = Dom.findDomBlockParent(range.start.dom, dom_root);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    t.equal(start.dom,dom_root.childNodes[n]);
    t.equal(start.mod,model.getRoot().child(n));
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    t.equal(end.dom,dom_root.childNodes[n+2]);
    t.equal(end.mod,model.getRoot().child(n));

    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));
    //Model.print(editor.getModel());

    t.equal(model.getRoot().child(n).child(0).text,'ab');
    t.equal(model.getRoot().child(n).child(1).child(0).text,'XXX');
    t.equal(model.getRoot().child(n+1).child(0).child(0).text,'YYY');
    t.equal(model.getRoot().child(n+1).child(1).text,'c');
    t.end();
});



test("paste multiple paragraphs 2", function(t) {
    var editor = makeTestBlocks();
    var dom_root = editor.getDomRoot();
    var model    = editor.getModel();
    var n = 1;
    var range = insertPaste(dom_root,n);


    var pdom = Dom.findDomBlockParent(range.start.dom, dom_root);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    t.equal(start.dom,dom_root.childNodes[n]);
    t.equal(start.mod,model.getRoot().child(n));
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    t.equal(end.dom,dom_root.childNodes[n+2]);
    t.equal(end.mod,model.getRoot().child(n));

    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));

    t.equal(model.getRoot().child(n).child(0).text,'de');
    t.equal(model.getRoot().child(n).child(1).child(0).text,'XXX');
    t.equal(model.getRoot().child(n+1).child(0).child(0).text,'YYY');
    t.equal(model.getRoot().child(n+1).child(1).text,'f');
    t.end();
});



test("paste multiple paragraphs 3", function(t) {
    var editor = makeTestBlocks();
    var dom_root = editor.getDomRoot();
    var model    = editor.getModel();
    var n = 4;
    var range = insertPaste(dom_root,n);

    //Dom.print(dom_root);
    var pdom = Dom.findDomBlockParent(range.start.dom, dom_root);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    t.equal(start.dom,dom_root.childNodes[n]);
    t.equal(start.mod,model.getRoot().child(n));
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    t.equal(end.dom,dom_root.childNodes[n+2]);
    t.equal(end.mod,model.getRoot().child(n));

    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));

    t.equal(model.getRoot().child(n).child(0).text,'mn');
    t.equal(model.getRoot().child(n).child(1).child(0).text,'XXX');
    t.equal(model.getRoot().child(n+1).child(0).child(0).text,'YYY');
    t.equal(model.getRoot().child(n+1).child(1).text,'o');
    t.end();
});

test("paste empty doc", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var header = model.makeBlock();
    header.style = 'header';
    header.append(model.makeText(""));
    model.getRoot().append(header);
    editor.syncDom();

    var dheader = dom_root.childNodes[0];
    var div1 = VirtualDoc.createElement('div');
    div1.appendChild(VirtualDoc.createTextNode('Xx\n'));
    dheader.appendChild(div1);
    var div2 = VirtualDoc.createElement('div');
    div2.appendChild(VirtualDoc.createTextNode('yY '));
    dheader.appendChild(div2);

    var range = {
        start: {
            dom:div2.childNodes[0],
            mod:null
        }
    };

    var pdom = Dom.findDomBlockParent(range.start.dom, dom_root);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));

    t.equal(model.getRoot().child(0).type,'block');
    t.equal(model.toPlainText(),'Xx\nyY ');
    t.end();

});

test("handle pasted spans", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var header = model.makeBlock();
    header.style = 'header';
    header.append(model.makeText("abcdef"));
    model.getRoot().append(header);
    editor.syncDom();

    //Model.print(model);
    //Dom.print(dom_root);

    var dheader = dom_root.childNodes[0];
    dheader.childNodes[0].nodeValue = 'abc';
    var span1 = VirtualDoc.createElement('SPAN');
    dheader.appendChild(span1);
    span1.appendChild(VirtualDoc.createTextNode("      return null;"));
    dom_root.appendChild(VirtualDoc.createTextNode(" \n "));

    var div1 = VirtualDoc.createElement('DIV');
    div1.appendChild(VirtualDoc.createTextNode('   }\n '));
    dom_root.appendChild(div1);

    var div2 = VirtualDoc.createElement('div');
    div2.appendChild(VirtualDoc.createElement('br'));
    dom_root.appendChild(div2);

    var div3 = VirtualDoc.createElement('div');
    dom_root.appendChild(div3);

    var div4 = VirtualDoc.createElement('DIV');
    div4.classList.add('header');
    div4.id = 'id_2';
    div4.appendChild(VirtualDoc.createTextNode('def'));
    dom_root.appendChild(div4);


    //console.log("------")
    //Model.print(model);
    //Dom.print(dom_root);
    //console.log("------")

    var range = {
        start: {
            dom:div3,
            mod:null
        }
    };

    var pdom = Dom.findDomBlockParent(range.start.dom, dom_root);
    //console.log("pdom is",pdom.id);
    //console.log('dom_root = ',dom_root.id);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));
    //Model.print(model);

    t.end();

});


test("pasting nukes adjacent styles", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var block = model.makeBlock();
    block.append(model.makeText('abc'));
    var span = model.makeSpan();
    span.style = 'strong';
    span.append(model.makeText('def'));
    block.append(span);
    block.append(model.makeText('ghi'));
    model.getRoot().append(block);
    editor.syncDom();
    //Model.print(editor.getModel());

    //Dom.print(editor.getDomRoot());
    var tnode = editor.getDomRoot().childNodes[0].childNodes[2];
    tnode.nodeValue = 'gXXXhi';
    //Dom.print(editor.getDomRoot());
    var range = {
        start: {
            dom:tnode,
            mod:null,
        },
        documentOffset: 10
    };
    Keystrokes.handlePastedText(range,editor);
    //Model.print(editor.getModel());

    t.equals(editor.getModel().getRoot().child(0).child(1).style,'strong');

    t.end();
});


test("pasting multi-line with junk span", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var block = model.makeBlock();
    block.append(model.makeText('abcd'));
    model.append(block);
    editor.syncDom();
    //Dom.print(editor.getDomRoot());

    var text1 = dom_root.childNodes[0].childNodes[0];
    text1.nodeValue = 'abXXX';

    var doc = dom_root.ownerDocument;
    var div2 = doc.createElement('div');
    div2.appendChild(doc.createTextNode('YYY'));
    dom_root.appendChild(div2);
    var span1 = doc.createElement('span');
    span1.appendChild(doc.createTextNode("\n"));
    dom_root.appendChild(span1);
    var div3 = doc.createElement('div');
    dom_root.appendChild(div3);
    var div4 = doc.createElement('div');
    div4.appendChild(doc.createTextNode('cd'));
    dom_root.appendChild(div4);


    //Dom.print(editor.getDomRoot());

    var range = {
        collapsed:true,
        start: {
            dom:div4.childNodes[0],
            mod:null,
        },
        documentOffset: 9
    };
    Keystrokes.handlePastedText(range,editor);
    //Model.print(editor.getModel());
    t.equal(editor.getModel().getRoot().child(2).type,Model.BLOCK);
    t.end();
});

test("pasting multi-line at end", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var block = model.makeBlock();
    block.append(model.makeText('abcd'));
    model.append(block);
    editor.syncDom();
    //Dom.print(editor.getDomRoot());

    var text1 = dom_root.childNodes[0].childNodes[0];
    text1.nodeValue = 'abXXX';

    var doc = dom_root.ownerDocument;
    var div2 = doc.createElement('div');
    div2.appendChild(doc.createTextNode('YYY'));
    dom_root.appendChild(div2);
    var span1 = doc.createElement('span');
    span1.appendChild(doc.createTextNode("\n"));
    dom_root.appendChild(span1);
    var div3 = doc.createElement('div');
    dom_root.appendChild(div3);
    var div4 = doc.createElement('div');
    div4.appendChild(doc.createTextNode('cd'));
    dom_root.appendChild(div4);


    //Dom.print(editor.getDomRoot());

    var range = {
        collapsed:true,
        start: {
            dom:div4.childNodes[0],
            mod:null,
        },
        documentOffset: 9
    };
    Keystrokes.handlePastedText(range,editor);
    //Model.print(editor.getModel());
    t.equal(editor.getModel().getRoot().child(2).type,Model.BLOCK);
    t.end();
});