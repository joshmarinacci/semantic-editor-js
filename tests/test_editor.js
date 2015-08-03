/**
 * Created by josh on 8/1/15.
 */

var test = require('tape');
var Editor = require('../src/editor');
var Dom = require('../src/dom');
var Model = require('../src/model');
var vdom = require('./virtualdom');

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

test("test custom keystroke", function(t) {
    //make editor
    var dom_root = vdom.createElement('div');
    var ed = Editor.makeEditor(dom_root);

    //register custom action
    ed.addAction({
        name:"insert-poop",
        consume:true,
        fun: function(event, editor) {
            var pos = editor.getCursorPosition(); //defaults to 0
            ed.insertPlainText(pos,'poop');
        }
    });

    //add a keybinding for cmd-shift-p
    ed.addKeyBinding('insert-poop',{
        command:true,
        shift:true,
        key:'p'
    });

    //make a model with a block and some text
    var block = ed.getModel().makeBlock();
    var text = ed.getModel().makeText("abcdef");
    block.append(text);
    ed.getModel().getRoot().append(block);

    //simulate the keyboard event:
    ed._simulateKeyboardEvent({metaKey:true,shiftKey:true,keyCode:80}); //this is cmd shift p
    t.equals(ed.toPlainText(),"poopabcdef");

});

function makeEditorWithLink(a,b,c,h) {
    var dom_root = vdom.createElement('div');
    var ed = Editor.makeEditor(dom_root);
    var block = ed.getModel().makeBlock();
    var t1 = ed.getModel().makeText(a);
    block.append(t1);
    var t2 = ed.getModel().makeText(b);
    var l1 = ed.getModel().makeSpan();
    l1.style = 'link';
    ed.getModel().getRoot().append(block);
}

test("type before a link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_text_1().getText(),'abc');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_1().nodeValue,'abc');
    //insert some text
    std.dom_text_1().nodeValue = 'abXc';
    std.ed.syncModel();
    std.ed.syncDom();
    t.equals(std.mod_text_1().getText(),'abXc');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_1().nodeValue,'abXc');
});

test("type middle of a link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_link_1().child(0).getText(),'def');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'def');
    //insert some text
    std.dom_link_1().childNodes[0].nodeValue = 'deXf';
    std.ed.syncModel();
    std.ed.syncDom();
    t.equals(std.mod_link_1().child(0).getText(),'deXf');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'deXf');
});

test("type after a link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_text_2().getText(),'abc');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_text_2().nodeValue,'abc');
    //insert some text
    std.dom_text_2().nodeValue = 'abXc';
    std.ed.syncModel();
    std.ed.syncDom();
    t.equals(std.mod_text_2().getText(),'abXc');
    t.equals(std.mod_link_2().meta.href,'http://poop.com/');
    t.equals(std.dom_text_2().nodeValue,'abXc');
});

test("enter key in middle of link", function(t) {
    var std = makeEditorWithLink('abc','def','ghi','http://poop.com/');
    //var link = std.model.getRoot().child(0).child(1)
    t.equals(std.mod_link_1().child(0).getText(),'def');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'def');

    //move cursor
    var pos = std.ed.makeModelPosition(std.mod_link_1(),2);
    std.ed.setCursor(pos);
    //enter key
    ed._simulateKeyboardEvent({metaKey:false,shiftKey:false,keyCode:13}); //this is enter key

    //verify
    t.equals(std.mod_link_1().child(0).getText(),'de');
    t.equals(std.mod_link_1().meta.href,'http://poop.com/');
    t.equals(std.dom_link_1().childNodes[0].nodeValue,'de');

    t.equals(std.ed.getModel().getRoot().child(1).child(0).child(0).getText(),'f');
    t.equals(std.ed.getModel().getRoot().child(1).child(0).meta.href,'http://poop.com');
    t.equals(std.ed.getModel().getRoot().child(1).child(0).type,'link');
});

//Fake typing letters into a link span. Verify span in mod & dom
// type before a link span. verify span in mod & dom.
// type after a link span. verify span in mod & dom
// Fake enter key. Verify both sides


//select text inside a link, make it bold. verify both inner and outer spans
//select exact text of a link, make it bold. verify
//select text outside of a link. make it bold. verify

//change block style from body to header at the cursor point. verify

// select subset of text. make bold. verify. undo. verify
// simple doc w/ image. verify image src
// doc w/ image. insert  text before image. verify.
// doc w/ image. insert text after image. verify.
// doc w/ image. position cursor after image. delete backwards. verify
// delete image. undo. verify.
// style text bold. verify. bold again. verify bold is gone now. undo. verify bold is back
// select text. make bold. select overlapping range. make italic. verify all three parts. undo. verify old is back.

// make simple doc. export to HTML. verify as plain text
// make doc with bold text and image. export as plain text. verify
// make nested bold/italic/link spans. move cursor with arrow keys. verify cursor position. verify get style
// make standard editor w/ default config. verify list of block styles
// make stadnard editor w/ default config. get list of actions w/ keybindings
// make doc w/ two blocks and nested spans. verify text only traversal
// make doc w/ two blocks and nested spans. verify full element traversal
// use a custom css class for a semantic style. sync to dom. verify.
// use a custom element for html export. do export. verify