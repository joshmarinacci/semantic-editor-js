/**
 * Created by josh on 7/27/15.
 */
var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var VirtualDoc = require('./virtualdom');
var Editor = require('../src/editor');
var Keystrokes = require('../src/keystrokes');

function makeStdModel() {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block = model.makeBlock();
    var text  = model.makeText("abc");
    block.append(text);
    model.getRoot().append(block);
    return editor;
}


/*
test("insert character",function(t) {
    //make a model
    var editor = makeStdModel();

    var dom_root = editor.getDomRoot();
    var model = editor.getModel();
    //generate a dom
    editor.syncDom();

    //modify the dom
    var sel = {
        start_node: dom_root.childNodes[0].childNodes[0],
        start_offset:0,
    };
    sel.start_node.nodeValue = 'abXc';
    sel.start_offset = 3;

    //calculate the range of the changes
    var range = Dom.calculateChangeRange(model,dom_root,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    t.equals(changes.length,1,'only one change');
    t.equals(changes[0].mod.id,model.getRoot().child(0).child(0).id,'correct id');

    //modify the model
    Dom.applyChanges(changes,model);
    t.equals(model.getRoot().child(0).child(0).text,'abXc','text updated');

    //incrementally update the dom
    editor.syncDom();
    t.equals(dom_root.child(0).child(0).nodeValue,'abXc','updated text');

    t.end();
});
*/
/*
test('insert text before span',function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block = model.makeBlock();
    model.getRoot().append(block);
    //block.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.style = 'link';
    span.append(model.makeText("def"));
    block.append(span);
    block.append(model.makeText("ghi"));

    //generate a dom
    editor.syncDom();


    //modify the dom
    dom_root.childNodes[0].insertBefore(
        VirtualDoc.createTextNode("XXX"),
        dom_root.childNodes[0].childNodes[0]
    );
    //create selection at the change
    var sel = {
        start_node: dom_root.childNodes[0].childNodes[0],
        start_offset:2
    };
    var range = Dom.calculateChangeRange(model,dom_root,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    //modify the model
    Dom.applyChanges(changes,model);
    t.equals(model.getRoot().child(0).child(0).text,'XXX','text inserted');
    t.end();
});

test('insert text inside span',function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block = model.makeBlock();
    model.getRoot().append(block);
    //block.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.style = 'link';
    span.append(model.makeText("def"));
    block.append(span);
    block.append(model.makeText("ghi"));
    //generate a dom
    editor.syncDom();

    //modify the dom
    var ch = dom_root.childNodes[0].childNodes[0].childNodes[0];
    ch.nodeValue = ch.nodeValue.substring(0,1)
        +'x'
        +ch.nodeValue.substring(1);
    //create selection at the change
    var sel = {
        start_node: dom_root.childNodes[0].childNodes[0].childNodes[0],
        start_offset:2,
    };

    var range = Dom.calculateChangeRange(model,dom_root,sel);
    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    //modify the model
    Dom.applyChanges(changes,model);
    t.equals(model.getRoot().child(0).child(0).child(0).text,'dxef','text inserted');
    t.end();
});

test('insert text after span',function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block = model.makeBlock();
    model.getRoot().append(block);
    //block.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.style = 'link';
    span.append(model.makeText("def"));
    block.append(span);
    block.append(model.makeText("ghi"));

    //generate a dom
    editor.syncDom();

    //modify the dom
    var ch = dom_root.childNodes[0].childNodes[1];
    ch.nodeValue = ch.nodeValue.substring(0,1)
        +'x'
        +ch.nodeValue.substring(1);
    //create selection at the change
    var sel = {
        start_node: ch,
        start_offset:2
    };

    var range = Dom.calculateChangeRange(model,dom_root,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    //modify the model
    Dom.applyChanges(changes,model);
    t.equals(model.getRoot().child(0).child(1).text,'gxhi','text inserted');
    t.end();
});
*/
test("delete text across spans", function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abc");
    block1.append(text1);
    model.getRoot().append(block1);
    var text1a = model.makeText("def");
    block1.append(text1a);
    var span1b = model.makeSpan();
    var text1ba = model.makeText("ghi");
    span1b.append(text1ba);
    block1.append(span1b);
    block1.append(model.makeText("jkl"));
    var span1c = model.makeSpan();
    var text1ca = model.makeText("mno");
    span1c.append(text1ca);
    block1.append(span1c);
    block1.append(model.makeText("pqr"));

    var block2 = model.makeBlock();
    var text2 = model.makeText("stu");
    block2.append(text2);
    model.append(block2);

    var block3 = model.makeBlock();
    var text3 = model.makeText("vwx");
    block3.append(text3);
    model.append(block3);



    dom_root.id = model.getRoot().id;

    //generate a dom
    editor.syncDom();


    var range = {
        start: {
            dom:Dom.findDomForModel(text1,dom_root),
            mod:text1,
            offset:1,
        },
        end:{
            dom:Dom.findDomForModel(text1ca,dom_root),
            mod:text1ca,
            offset:3,
        }
    };

    t.equals(range.start.dom.nodeValue,'abc');
    t.equals(range.end.dom.nodeValue,'mno');

    var changes = Dom.makeDeleteTextRange(range,model);
    t.equal(changes.length,5,'change count');
    Dom.applyChanges(changes,model);


    t.equal(model.findNodeById("id_3").text,'a');
    t.equal(model.findNodeById("id_4"),null);
    t.equal(model.findNodeById("id_5"),null);
    t.equal(model.findNodeById("id_10").text,'pqr');

    editor.syncDom();
    t.end();
});

test("calculate common parent path",function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abc");
    block1.append(text1);
    model.getRoot().append(block1);
    var text1a = model.makeText("def");
    block1.append(text1a);
    var span1b = model.makeSpan();
    var text1ba = model.makeText("ghi");
    span1b.append(text1ba);
    block1.append(span1b);
    block1.append(model.makeText("jkl"));
    var span1c = model.makeSpan();
    var text1ca = model.makeText("mno");
    span1c.append(text1ca);
    block1.append(span1c);
    var text1d = model.makeText('pqr');
    block1.append(text1d);

    var block2 = model.makeBlock();
    var text2 = model.makeText("stu");
    block2.append(text2);
    model.append(block2);

    var block3 = model.makeBlock();
    var text3 = model.makeText("vwx");
    block3.append(text3);
    model.append(block3);

    editor.syncDom();

    var range = {
        start: {
            mod: text1ca,
            dom: Dom.findDomForModel(text1ca,dom_root),
            offset:1
        },
        end: {
            mod: text1d,
            dom: Dom.findDomForModel(text1d,dom_root),
            offset:1
        }
    };
    var changes = Dom.makeDeleteTextRange(range,model);
    Dom.applyChanges(changes,model);

    var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
    t.equals(com_mod.id,block1.id,'common parent id');
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc, editor.getMapping());
    t.equals(dom_root.childNodes[0].childNodes[4].childNodes[0].nodeValue,
        "m",'text was changed');
    t.end();
});

function makeTextSubsetRange(mod,start,end,dom_root) {
    return {
        start: {
            mod: mod,
            dom: Dom.findDomForModel(mod,dom_root),
            offset:start
        },
        end: {
            mod: mod,
            dom: Dom.findDomForModel(mod,dom_root),
            offset:end
        }
    }
}

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
    Dom.modelToDom(model,dom_root,VirtualDoc, editor.getMapping());
    return editor;
}

function makeRange(smod,soff,emod,eoff, dom_root) {
    var range = {
        start: {
            mod: smod,
            dom: Dom.findDomForModel(smod,dom_root),
            offset:soff
        },
        end: {
            mod: emod,
            dom: Dom.findDomForModel(emod,dom_root),
            offset:eoff
        }
    };
    return range;
}
test("forward delete into span",function(t) {
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var dom_root = editor.getDomRoot();
    var range = makeRange(
        model.getRoot().child(0).child(0),
        3,
        model.getRoot().child(0).child(1).child(0),
        0,
        editor.getDomRoot()
    );


    var changes = Dom.makeDeleteTextRange(range,model);
    Dom.applyChanges(changes,model);
    editor.syncDom();
    t.end();
});


test("delete selection across block boundaries", function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    //make model
    var model = editor.getModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abc");
    block1.append(text1);
    model.getRoot().append(block1);
    var block2 = model.makeBlock();
    var text2  = model.makeText("def");
    block2.append(text2);
    model.getRoot().append(block2);

    //make dom
    dom_root.id = model.getRoot().id;
    editor.syncDom();

    var range = {
        start: {
            dom:Dom.findDomForModel(text1,dom_root),
            mod:text1,
            offset:1
        },
        end:{
            dom:Dom.findDomForModel(text2,dom_root),
            mod:text2,
            offset:1
        }
    };

    t.equals(range.start.dom.nodeValue,'abc');
    t.equals(range.end.dom.nodeValue,'def');

    var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);

    var changes = Dom.makeDeleteTextRange(range,model);
    Dom.applyChanges(changes,model);
    t.equal(changes.length,4,'change count');
    t.equal(model.findNodeById("id_3").text,'a');
    t.equal(model.findNodeById("id_4"),null);
    t.equal(model.findNodeById("id_5").text,'ef');
    t.equals(com_mod.id,model.getRoot().id,'common parent id');
    t.end();
});

test("split block in half w/ text", function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    //make model
    var model = editor.getModel();
    var block1 = model.makeBlock();
    var text1 = model.makeText("abc");
    block1.append(text1);
    model.getRoot().append(block1);

    editor.syncDom();

    var range = {
        start: {
            mod: text1,
            offset:1
        }
    };
    var changes = Dom.makeSplitChange(range,model);
    Dom.applyChanges(changes,model);
    t.equal(model.getRoot().child(0).childCount(),1);
    t.end();

});

test("split block in half w/ span and more text", function(t) {
    var dom_root = VirtualDoc.createElement("div");
    var editor = Editor.makeEditor(dom_root);
    //make model
    var model = editor.getModel();
    var block1 = model.makeBlock();
    var text1 = model.makeText("abc");
    block1.append(text1);
    var text2 = model.makeText("def");
    var span = model.makeSpan();
    span.append(text2);
    block1.append(span);
    var text3 = model.makeText("ghi");
    block1.append(text3);
    model.getRoot().append(block1);

    editor.syncDom();

    var range = {
        start: {
            mod: text2,
            offset:1
        }
    };
    var changes = Dom.makeSplitChange(range,model);
    Dom.applyChanges(changes,model);
    t.end();
});


test("delete single char span", function(t) {
    //standard span test
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var dom_root = editor.getDomRoot();
    //change to be one char wide
    model.getRoot().child(0).child(1).child(0).text = 'X';
    var range = makeRange(
        model.getRoot().child(0).child(1).child(0),
        0,
        model.getRoot().child(0).child(1).child(0),
        1,
        editor.getDomRoot()
    );

    var changes = Dom.makeDeleteTextRange(range,model);
    Dom.applyChanges(changes,model);
    t.end();

});


test("make span around another",function(t){
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var dom_root = editor.getDomRoot();
    var block = model.getRoot().child(0);
    t.equal(block.childCount(),3);
    t.equal(block.child(1).childCount(),1);
    var range = makeRange(block.child(0),1,block.child(2),1, dom_root);
    var changes = Dom.makeStyleTextRange(range,model,'bold');
    Dom.applyChanges(changes,model);
    t.equal(block.childCount(),3);
    t.equal(block.child(1).childCount(),3);
    t.end();
});

test("make span around another, on the span",function(t){
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var block = model.getRoot().child(0);
    t.equal(block.childCount(),3);
    t.equal(block.child(1).childCount(),1);
    var range = makeRange(block.child(0),1,block.child(1).child(0),1, editor.getDomRoot());
    var changes = Dom.makeStyleTextRange(range,model,'bold');
    Dom.applyChanges(changes,model);
    t.equal(block.childCount(),4);
    t.equal(block.child(1).childCount(),2);
    t.end();
});

test("clear styles from selection",function(t){
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var block = model.getRoot().child(0);
    t.equal(block.childCount(),3);
    t.equal(block.child(1).childCount(),1);
    var range = makeRange(block.child(0),1,block.child(2),1, editor.getDomRoot());
    var changes = Dom.makeClearStyleTextRange(range,model);
    Dom.applyChanges(changes,model);
    t.equal(block.childCount(),5);
    t.end();
});

test("clear styles from selection 2",function(t){
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var block = model.getRoot().child(0);
    //select inside the span only
    var range = makeRange(
        block.child(1).child(0),0,
        block.child(1).child(0),2,
        editor.getDomRoot());
    var changes = Dom.makeClearStyleTextRange(range,model);
    Dom.applyChanges(changes,model);
    //the span became empty, so it should have been trimmed, leaving only 2 kids
    t.equal(block.childCount(),2);
    t.end();
});


test("handle pasted span", function(t) {
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var dom_root = editor.getDomRoot();
    var span = dom_root.ownerDocument.createElement("span");
    var txt = dom_root.ownerDocument.createTextNode("foo");
    var par = dom_root.childNodes[0];
    span.appendChild(txt);
    par.insertBefore(span,par.childNodes[1]);

    var dp1 = Dom.findDomParentWithId(txt)
    var mp1 = Dom.findModelForDom(model,dp1);

    var insert_off = 3;
    var insert_dom = txt;
    var doff = insert_off + Dom.domToDocumentOffset(dom_root,txt).offset;
    t.equals(doff,6);

    var new_mod = Dom.rebuildModelFromDom(dp1,model, editor.getImportMapping());
    model.swapNode(mp1,new_mod);
    t.equals(model.getRoot().child(0).child(0).text,'abc');
    t.equals(model.getRoot().child(0).child(1).child(0).text,'foo');
    t.equals(model.getRoot().child(0).child(2).child(0).text,'def');
    t.equals(model.getRoot().child(0).child(3).text,'ghi');

    editor.syncDom();
    t.equals(dom_root.childNodes[0].id,new_mod.id);

    //measure offset in dom space
    //set it back in dom space
    var offd = Dom.documentOffsetToDom(dom_root,doff);
    var dd = dom_root.childNodes[0].childNodes[1].childNodes[0];
    t.equals(offd.node,dd);
    t.end();
});

test("link back and forth conversion", function(t) {
    var url = 'http://joshondesign.com/';
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var link = model.getRoot().child(0).child(1);
    link.style = 'link';
    link.meta = { href:url };


    t.equal(link.style, 'link');
    t.equal(link.meta.href, url);
    editor.syncDom();
    var dlink = editor.getDomRoot().childNodes[0].childNodes[1];
    t.equal(dlink.atts.href,url);
    var mroot2 = Dom.rebuildModelFromDom(editor.getDomRoot(), model, editor.getImportMapping());
    var link2 = mroot2.child(0).child(1);
    t.equal(link2.style, 'link');
    t.isNot(link2.meta,undefined);
    //t.equal(link2.meta.href, url);
    t.end();
});

test("header back and forth conversion", function(t) {
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var header1 = model.getRoot().child(0)
    header1.style = 'header';

    t.equal(header1.style, 'header');
    editor.syncDom();
    var mroot2 = Dom.rebuildModelFromDom(editor.getDomRoot(), model, editor.getImportMapping());
    var header2 = mroot2.child(0);
    t.equal(header2.style, 'header');
    t.end();
});


test("multiline paste", function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var block = model.makeBlock();
    block.append(model.makeText("This"))
    model.getRoot().append(block);
    editor.syncDom();
    var dom_root = editor.getDomRoot();
    var span = VirtualDoc.createElement('span');
    span.appendChild(VirtualDoc.createTextNode('a'));
    dom_root.childNodes[0].appendChild(span);

    var div1 = VirtualDoc.createElement('div');
    div1.appendChild(VirtualDoc.createTextNode('b'));
    dom_root.appendChild(div1);

    //this empty div is probably the problem
    var div2 = VirtualDoc.createElement('div');
    dom_root.appendChild(div2);

    var div3 = VirtualDoc.createElement('div');
    div3.id = 'id_2';
    div3.classList.add('body');
    div3.appendChild(VirtualDoc.createTextNode("is an empty post"));
    dom_root.appendChild(div3);

    Dom.print(dom_root);
    t.end();

});
return;

test("make span around another, start on the span",function(t){
    var editor = makeTextSpanText();
    var model = editor.getModel();
    var dom_root = editor.getDomRoot();
    var block = model.getRoot().child(0);
    t.equal(block.childCount(),3);
    t.equal(block.child(1).childCount(),1);
    var range = makeRange(block.child(1).child(0),1,block.child(2),1, dom_root);
    var changes = Dom.makeStyleTextRange(range,model,'bold');
    Dom.applyChanges(changes,model);
    t.equal(block.childCount(),4);
    t.equal(block.child(1).childCount(),2);
    editor.syncDom();
    t.end();
});