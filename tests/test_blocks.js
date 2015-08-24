/**
 * Created by josh on 8/24/15.
 */
var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var VirtualDoc = require('./virtualdom');
var Editor = require('../src/editor');
var Keystrokes = require('../src/keystrokes');


test('create a list item',function(t) {
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model  = editor.getModel();
    var blk = model.makeBlock().setStyle('body');
    blk.append(model.makeText("abc"));
    model.getRoot().append(blk);
    editor.syncDom();
    Model.print(editor.getModel());

    //verify
    t.equals(model.getRoot().childCount(),1);
    t.equals(model.getRoot().child(0).childCount(),1);
    t.equals(model.getRoot().child(0).style,'body');

    editor.setSelectionAtDocumentOffset(1,1);

    Keystrokes.changeBlockStyle(null,editor,'list-item');
    Model.print(editor.getModel());

    t.end();

});

test('back delete inside of a list item',function(t){
    var dom_root = VirtualDoc.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model  = editor.getModel();
    var list = model.makeBlock().setStyle('ordered-list');
    model.getRoot().append(list);
    list.append(model.makeBlock().setStyle('list-item').append(model.makeText("abcdef")));
    list.append(model.makeBlock().setStyle('list-item').append(model.makeText("ghijkl")));
    editor.syncDom();
    Model.print(model);

    editor.setSelectionAtDocumentOffset(2,2);
    Keystrokes.deleteBackwards(null,editor);
    Model.print(model);


    t.end();
});