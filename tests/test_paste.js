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
    var pdom = Dom.findDomBlockParent(range.start.dom);
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
    t.equal(model.getRoot().child(n+2).child(0).child(0).text,'YYY');
    t.equal(model.getRoot().child(n+2).child(1).text,'c');
    t.end();
});



test("paste multiple paragraphs 2", function(t) {
    var editor = makeTestBlocks();
    var dom_root = editor.getDomRoot();
    var model    = editor.getModel();
    var n = 1;
    var range = insertPaste(dom_root,n);


    var pdom = Dom.findDomBlockParent(range.start.dom);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    t.equal(start.dom,dom_root.childNodes[n]);
    t.equal(start.mod,model.getRoot().child(n));
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    t.equal(end.dom,dom_root.childNodes[n+2]);
    t.equal(end.mod,model.getRoot().child(n));

    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));

    t.equal(model.getRoot().child(n).child(0).text,'de');
    t.equal(model.getRoot().child(n).child(1).child(0).text,'XXX');
    t.equal(model.getRoot().child(n+2).child(0).child(0).text,'YYY');
    t.equal(model.getRoot().child(n+2).child(1).text,'f');
    t.end();
});



test("paste multiple paragraphs 3", function(t) {
    var editor = makeTestBlocks();
    var dom_root = editor.getDomRoot();
    var model    = editor.getModel();
    var n = 4;
    var range = insertPaste(dom_root,n);

    //Dom.print(dom_root);
    var pdom = Dom.findDomBlockParent(range.start.dom);
    var start = Keystrokes.scanDomBackwardsForMatch(pdom,model);
    t.equal(start.dom,dom_root.childNodes[n]);
    t.equal(start.mod,model.getRoot().child(n));
    var end  = Keystrokes.scanDomForwardsForMatch(pdom,model);
    t.equal(end.dom,dom_root.childNodes[n+2]);
    t.equal(end.mod,model.getRoot().child(n));

    editor.applyChange(Keystrokes.makeChangesFromPasteRange(start,end,editor));

    t.equal(model.getRoot().child(n).child(0).text,'mn');
    t.equal(model.getRoot().child(n).child(1).child(0).text,'XXX');
    t.equal(model.getRoot().child(n+2).child(0).child(0).text,'YYY');
    t.equal(model.getRoot().child(n+2).child(1).text,'o');
    t.end();
});

