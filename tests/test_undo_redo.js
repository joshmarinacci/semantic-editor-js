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

/**
 * Created by josh on 8/5/15.
 */
/*test('undo text insert', function(t) {
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

    var changes = Dom.makeSplitChange(range,model);
    console.log('changes = ', changes);
    var chg = {
        _changes: changes,
        undoit: function() {
            console.log("undoing it");
            this._changes.forEach(function(chg) {
                chg.undo();
            })
        },
        redoit: function() {
            console.log("redoing it");
            Dom.applyChanges(this._changes, model);
        }
    };
    editor.addChangeEvent(chg);

    editor.applyChange();
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
*/
/*

can everything be defined in terms of
add block, remove block, modify block contents?
are they also undoable?


type some text
this becomes modify block contents, though we'll want some encoding to make it small
to undo it we must save the old block contents and swap it back

press enter to split the current block
this will modify the current block and insert a second one
to reverse it we must delete the second one and revert the current one

style a span
this becomes modify block

style a block
this becomes deleting a block and replacing it?

delete across multiple blocks
becomes two modifies and several inserts
undo it with several deletes and two unmodifies.

can modify be replaced with insert and delete?

when handling a big paste, we must determine which blocks were changed and which were inserted


insert is a new node, a parent node (by id?), and an index to insert it at.
using an index this avoids referencing adjacent nodes.

delete is the node to delete, a parent node (by id) and an index to delete from.
maybe we don't even need the node, just the index.


unit test:

make a doc with one block
create event which inserts block at 0 (before the initial block)
undo it
redo it


execute and fully undo and redo this sequence:

start with an empty block and text ""
insert abcdef
split in half
bold the b
italics the d
select and delete from a to e, forcing the back merge
now undo back styling but not the split
now append another block
change the style of the block to header
fully delete the first block, leaving the second
now undo all the way back

*/

function makeInsertBlockChange(parent, index, node) {
    return {
        redoit: function() {
            console.log("doing insert");
            parent.content.splice(index,0,node);
            node.parent = parent;
        },
        undoit: function() {
            console.log('undoing insert');
            parent.content.splice(index,1);
        }
    }
}
function makeDeleteBlockChange(parent, index, node) {
    return {
        redoit: function() {
            console.log("doing delete");
            parent.content.splice(index,1);
        },
        undoit: function() {
            console.log("undoing delete");
            parent.content.splice(index,0,node);
            node.parent = parent;
        }
    }
}

function duplicateBlock(block) {
    if(block == null) throw new Error('null block. cant duplicate');
    if(block.type == Model.TEXT) {
        var blk = block.model.makeText(block.text);
        return blk;
    }
    if(block.type == Model.SPAN) {
        var blk = block.model.makeSpan();
        blk.style = block.style;
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    if(block.type == Model.BLOCK) {
        var blk = block.model.makeBlock();
        blk.style = block.style;
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    throw new Error('cant duplicate',block);
}

function makeReplaceBlockChange(parent, index, newNode) {
    var oldNode = parent.content[index];
    var del = makeDeleteBlockChange(parent, index, oldNode);
    var ins = makeInsertBlockChange(parent, index, newNode);
    return makeComboChange(del,ins,'replace block');
}

test("full undo/redo sequence",function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();
    var blk1 = model.makeBlock();
    var txt1 = model.makeText("");
    blk1.append(txt1);
    model.getRoot().append(blk1);
    editor.syncDom();
    t.equal(model.getRoot().childCount(),1);

    //insert 'abcdef'
    var blk2 = model.makeBlock();
    blk2.append(model.makeText("abcdef"));
    editor.applyChange(makeInsertBlockChange(model.getRoot(),0, blk2));
    t.equal(model.getRoot().childCount(),2);
    editor.undoChange();
    t.equal(model.getRoot().childCount(),1);
    editor.redoChange();
    t.equal(model.getRoot().childCount(),2);

    //delete the empty span
    editor.applyChange(makeDeleteBlockChange(model.getRoot(),1,model.getRoot().child(1)));
    t.equal(model.getRoot().childCount(),1);
    editor.undoChange();
    t.equal(model.getRoot().childCount(),2);
    editor.redoChange();
    t.equal(model.getRoot().childCount(),1);



    //type into the span an extra 'ghi' at the end;
    var oldBlock = model.getRoot().child(0);
    var newBlock = duplicateBlock(model.getRoot().child(0));
    newBlock.child(0).text = oldBlock.child(0).text + "ghi";
    editor.applyChange(makeReplaceBlockChange(model.getRoot(),0, newBlock));
    t.equal(model.getRoot().childCount(),1);
    t.equal(model.getRoot().child(0).child(0).text,'abcdefghi');
    editor.undoChange();
    t.equal(model.getRoot().childCount(),1);
    t.equal(model.getRoot().child(0).child(0).text,'abcdef');
    editor.redoChange();


    //split the text in half between c and d
    var txt = model.getRoot().child(0).child(0);
    editor.applyChange(makeSplitTextChange(txt,3));
    t.equal(model.getRoot().childCount(),2);
    t.equal(model.getRoot().child(0).child(0).text,'abc');
    t.equal(model.getRoot().child(1).child(0).text,'defghi');


    //bold the b
    var txt = model.getRoot().child(0).child(0);
    editor.applyChange(makeStyledSelection(txt,1,2,'bold'));
    t.equal(model.getRoot().childCount(),2);
    t.equal(model.getRoot().child(0).childCount(),3);
    t.equal(model.getRoot().child(0).child(1).childCount(),1);
    t.equal(model.getRoot().child(0).child(1).style,'bold');
    t.equal(model.getRoot().child(0).child(1).child(0).text,'b');

    editor.undoChange();
    t.equal(model.getRoot().childCount(),2);
    t.equal(model.getRoot().child(0).childCount(),1);
    t.equal(model.getRoot().child(0).child(0).text,'abc');
    editor.redoChange();

    //italics the de
    var txt = model.getRoot().child(1).child(0);
    editor.applyChange(makeStyledSelection(txt,0,2,'italic'));
    t.equal(model.getRoot().child(1).child(1).style,'italic');
    t.equal(model.getRoot().child(1).child(1).child(0).text,'de');

    //select and delete from a to e, forcing the back merge
    var txt1 = model.getRoot().child(0).child(0);
    var txt2 = model.getRoot().child(1).child(1).child(0);
    editor.applyChange(makeDeleteSelectionChange(txt1,1,txt2,1));

    //undo back to the split
    editor.undoChange();
    editor.undoChange();
    editor.undoChange();
    Model.print(model);

    //insert a new block
    var blk3 = model.makeBlock();
    blk3.append(model.makeText("header text"));
    editor.applyChange(makeInsertBlockChange(model.getRoot(),2,blk3));

    //make it be styled as header
    editor.applyChange(makeBlockStyleChange(blk3,'header'));
    Model.print(model);

    //fully delete the first block, leaving the second
    editor.applyChange(makeDeleteBlockChange(model.getRoot(),0,model.getRoot().child(0)));
    Model.print(model);

    //undo all the way back to the start
    while(editor._undostack.length > 0) {
        editor.undoChange();
        Model.print(model);
    }

    t.end();
});

function makeComboChange(chg1, chg2, name) {
    return {
        redoit: function() {
            console.log("doing "+name);
            chg1.redoit();
            chg2.redoit();
        },
        undoit: function() {
            console.log("undoing "+name);
            chg2.undoit();
            chg1.undoit();
        }
    }
}
function makeDeleteSelectionChange(txt1, off1, txt2, off2) {
    var oblock = txt1.getParent();
    var nblock = duplicateBlock(oblock);
    var ntext1 = nblock.child(txt1.getIndex());
    ntext1.text = txt1.text.substring(0,off1);
    //delete everything after ntext1
    var dcount = nblock.content.length - ntext1.getIndex()-1;
    nblock.content.splice(ntext1.getIndex()+1,dcount);
    var chg1 = makeReplaceBlockChange(oblock.getParent(),oblock.getIndex(), nblock);

    var oblock2 = txt2.getParent().getParent();
    var nblock2 = duplicateBlock(oblock2);
    nblock2.child(0).deleteFromParent();
    var chg2 = makeReplaceBlockChange(oblock2.getParent(), oblock2.getIndex(), nblock2);
    return makeComboChange(chg1,chg2,'delete selection');
}

function makeBlockStyleChange(blk, style) {
    var oldstyle = blk.style;
    return {
        redoit: function() {
            console.log("redoing block style");
            blk.style = style;
        },
        undoit: function() {
            blk.style = oldstyle;
        }
    }
}
function makeStyledSelection(otext,off1,off2,style) {
    var oblock = otext.getParent();
    var nblock = duplicateBlock(oblock);
    var ntext1  = nblock.child(otext.getIndex());
    ntext1.text = otext.text.substring(0,off1);
    var nspan = nblock.model.makeSpan();
    nspan.style = style;
    var ntext2  = nblock.model.makeText(otext.text.substring(off1,off2));
    nspan.append(ntext2);
    nblock.content.splice(ntext1.getIndex()+1,0,nspan);
    nspan.parent = nblock;
    var ntext3  = nblock.model.makeText(otext.text.substring(off2));
    nblock.content.splice(ntext1.getIndex()+2,0,ntext3);
    return makeReplaceBlockChange(oblock.getParent(),oblock.getIndex(),nblock);
}

function makeSplitTextChange(otext,offset) {
    var oblock = otext.getParent();
    var nblock = duplicateBlock(oblock);
    var ntext  = nblock.child(otext.getIndex());
    ntext.text = otext.text.substring(0,offset);
    var chg1 = makeReplaceBlockChange(oblock.getParent(),oblock.getIndex(),nblock);
    var nblock2 = oblock.model.makeBlock();
    nblock2.style = oblock.style;
    var ntext2 = oblock.model.makeText(otext.text.substring(offset));
    nblock2.append(ntext2);
    var chg2 = makeInsertBlockChange(oblock.getParent(),oblock.getIndex()+1,nblock2);
    return makeComboChange(chg1,chg2,'replace block');
}

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

test("single-line style", function(t) {
    var editor = makeThreeBlocks();
    var range = makeRange(editor,2,4);
    var chg = Keystrokes.makeStyleSelectionChange(range,'bold');
    editor.applyChange(chg);
    var blk = editor.getModel().getRoot().child(0);
    t.equals(blk.child(0).text,'ab');
    t.equals(blk.child(1).child(0).text,'cd');
    t.equals(blk.child(2).text,'ef');
    t.end();
});

test("multi-line style", function(t) {
    var editor = makeThreeBlocks();
    var range = makeRange(editor,2,15);
    var chg = Keystrokes.makeStyleSelectionChange(range,'bold');
    editor.applyChange(chg);
    Model.print(editor.getModel());
    var blk = editor.getModel().getRoot().child(0);
    t.equals(blk.child(0).text,'ab');
    t.equals(blk.child(1).child(0).text,'cdef');
    var blk2 = editor.getModel().getRoot().child(1);
    t.equals(blk2.child(0).child(0).text,'ghijkl');
    t.end();
});

test('block style change', function(t) {
    var editor = makeThreeBlocks();
    t.equals(editor.getModel().getRoot().child(1).style,'body');
    var range = makeRange(editor,8,9);
    t.equals(range.start.mod.id,'id_5');
    var chg = Keystrokes.makeBlockStyleChange(range,'header');
    editor.applyChange(chg);
    t.equals(editor.getModel().getRoot().child(1).style,'header');
    editor.undoChange();
    t.equals(editor.getModel().getRoot().child(1).style,'body');
    editor.redoChange();
    t.equals(editor.getModel().getRoot().child(1).style,'header');
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
    Keystrokes.deleteForwards(null,editor);
    t.equals(editor.getModel().getRoot().child(0).child(1).text,'def');
    Keystrokes.splitLine(null,editor);
    t.equals(editor.getModel().getRoot().child(1).child(0).text,'');
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

test('backwards delete across spans', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    blk1.append(model.makeText("def"));
    model.getRoot().append(blk1);
    editor.syncDom();
    Model.print(model);
    editor.setSelectionAtDocumentOffset(3,3);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Keystrokes.deleteBackwards(null,editor);
    Model.print(model);

    t.equal(model.toPlainText(),'abdef');
    t.end();
});


test('backwards delete across spans2', function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model = editor.getModel();

    var blk1 = model.makeBlock();
    blk1.append(model.makeText("abc"));
    blk1.append(model.makeText("def"));
    blk1.append(model.makeText("ghi"));
    model.getRoot().append(blk1);
    editor.syncDom();
    Model.print(model);
    editor.setSelectionAtDocumentOffset(2,7);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Keystrokes.deleteBackwards(null,editor);
    Model.print(model);

    t.equal(model.toPlainText(),'abhi');
    t.end();
});
return;


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
    blk1.append(img);
    blk1.append(model.makeText("def"));
    model.getRoot().append(blk1);
    editor.syncDom();


    Model.print(model);

    editor.setSelectionAtDocumentOffset(3,3);
    var range = editor.getSelectionRange();
    console.log("range is " + range);
    Keystrokes.deleteBackwards(null,editor);
    Model.print(model);

});

