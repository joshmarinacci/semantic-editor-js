/**
 * Created by josh on 8/1/15.
 */

var test = require('tape');
var Editor = require('../src/editor');
var Dom = require('../src/dom');
var Model = require('../src/model');
var vdom = require('./virtualdom');

/*
test("make editor", function(t) {
    var dom_root = vdom.createElement('div');
    var ed = Editor.makeEditor(dom_root);

    //make a model with a block and some text
    var block = ed.getModel().makeBlock();
    var text = ed.getModel().makeText("abcdef");
    block.append(text);
    ed.getModel().getRoot().append(block);

    //verify the model
    t.equals(ed.getModel().getRoot().child(0).type,'block');
    t.equals(ed.getModel().getRoot().child(0).child(0).type,'text');
    t.equals(ed.getModel().getRoot().child(0).child(0).text,'abcdef');

    //update the dom
    ed.syncDom();

    //verify the dom looks right
    t.equals(dom_root.childNodes[0].childNodes[0].nodeValue,'abcdef');

    //set the cursor to be 3 letters in
    var pos = ed.makeModelPosition(text,3);
    //insert text. it should update the dom automatically

    ed.insertPlainText(pos,'123');
    //verify the model
    t.equals(ed.getModel().getRoot().child(0).child(0).text,'abc');
    t.equals(ed.getModel().getRoot().child(0).child(1).text,'123');
    t.equals(ed.getModel().getRoot().child(0).child(2).text,'def');
    //verify the dom
    t.equals(dom_root.childNodes[0].childNodes[0].nodeValue,'abc');
    t.equals(dom_root.childNodes[0].childNodes[1].nodeValue,'123');
    t.equals(dom_root.childNodes[0].childNodes[2].nodeValue,'def');

    Model.print(ed.getModel());

    t.end();
});
*/

/*
test("test custom keystroke", function(t) {
    //make editor
    var dom_root = vdom.createElement('div');
    var ed = Editor.makeEditor(dom_root);

    //register custom action
    ed.addAction("insert-poop", function(event, editor) {
        var pos = editor.getCursorPosition(); //defaults to 0
        ed.insertPlainText(pos,'poop');
    });

    //add a keybinding for cmd-shift-p
    ed.addKeyBinding('insert-poop','cmd-shift-p');

    //make a model with a block and some text
    var block = ed.getModel().makeBlock();
    var text = ed.getModel().makeText("abcdef");
    block.append(text);
    ed.getModel().getRoot().append(block);

    //simulate the keyboard event:
    ed._simulateKeyboardEvent({metaKey:true,shiftKey:true,keyCode:80}); //this is cmd shift p
    t.equals(ed.toPlainText(),"poopabcdef");
    t.end();
});
*/


function makeEditorWithLink(a,b,c,h) {
    var dom_root = vdom.createElement('div');
    var ed = Editor.makeEditor(dom_root);
    var block = ed.getModel().makeBlock();
    var t1 = ed.getModel().makeText(a);
    block.append(t1);
    var t2 = ed.getModel().makeText(b);
    var l1 = ed.getModel().makeSpan();
    l1.style = 'link';
    l1.meta = { href:h};
    l1.append(t2);
    block.append(l1);
    var t3 = ed.getModel().makeText(c);
    block.append(t3);
    ed.getModel().getRoot().append(block);
    ed.syncDom();
    Dom.print(ed.getDomRoot());
    return {
        mod_text_1: function() {
            return t1;
        },
        mod_text_2: function() {
            return t2;
        },
        mod_link_1: function() {
            return l1;
        },
        mod_link_1: function() {
            return l1;
        },
        dom_text_1: function() {
            return dom_root.childNodes[0].childNodes[0]
        },
        dom_link_1: function() {
            return dom_root.childNodes[0].childNodes[1]
        },
        dom_text_2: function() {
            return dom_root.childNodes[0].childNodes[2]
        },
        ed: ed
    }
}
/*
test("type before a link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_text_1().text,'abc');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_1().nodeValue,'abc');
    //insert some text
    std.dom_text_1().nodeValue = 'abXc';
    //std.ed.syncModel();
    std.ed.syncDom();
    t.equals(std.mod_text_1().text,'abXc');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_1().nodeValue,'abXc');
    t.end();
});
*/
/*
test("type middle of a link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_link_1().child(0).text,'def');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'def');
    //insert some text
    std.dom_link_1().childNodes[0].nodeValue = 'deXf';
    //std.ed.syncModel();
    std.ed.syncDom();
    t.equals(std.mod_link_1().child(0).text,'deXf');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'deXf');
    t.end();
});
*/

/*
test("type after a link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_text_1().text,'abc');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_1().nodeValue,'abc');
    //insert some text
    std.dom_text_2().nodeValue = 'ghXi';
    std.ed.syncModel();
    std.ed.syncDom();
    t.equals(std.mod_text_2().text,'ghXi');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_2().nodeValue,'abXc');
    t.end();
});
*/

/*
test("enter key in middle of link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_link_1().child(0).text,'def');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'def');

    //move cursor
    var pos = std.ed.makeModelPosition(std.mod_link_1(),2);
    //std.ed.setCursor(pos);
    //enter key
    std.ed._simulateKeyboardEvent({metaKey:false,shiftKey:false,keyCode:13}); //this is enter key

    //verify
    t.equals(std.mod_link_1().child(0).text,'de');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'de');

    t.equals(std.ed.getModel().getRoot().child(1).child(0).child(0).text,'f');
    t.equals(std.ed.getModel().getRoot().child(1).child(0).meta.href,'http://poop.com');
    t.equals(std.ed.getModel().getRoot().child(1).child(0).type,'link');
    t.end();
});
*/