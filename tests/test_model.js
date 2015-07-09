/**
 * Created by josh on 7/8/15.
 */

var doc = require('../src/model');
var test = require('tape');

test('make one block',function(t){
    console.log("running tests");

    var model = doc.makeModel();
    var block = model.makeBlock();
    var text  = model.makeText("some text");
    block.append(text);
    model.append(block);

    t.equal(model.countCharacters(),9);
    t.end();
});

test('make two blocks, one empty', function(t) {
    var model = doc.makeModel();
    var block = model.makeBlock();
    var text  = model.makeText("some text");
    block.append(text);
    model.append(block);
    var block2 = model.makeBlock();
    model.append(block2);

    t.equals(model.countCharacters(),9);
    t.end();
});

test('insert text',function(t) {
    var model = doc.makeModel();
    var block = model.makeBlock();
    var text  = model.makeText("abc");
    block.append(text);
    model.append(block);
    model.insertText(text,0,'def');
    t.equals(model.countCharacters(),6);
    model.insertText(text,6,'def');
    t.equal(model.countCharacters(),9);
    t.equal(model.toPlainText(),'defabcdef');
    t.end();
});

function makeSimpleTextBlock(string) {
    var model = doc.makeModel();
    var block = model.makeBlock();
    var text = model.makeText(string);
    block.append(text);
    model.append(block);
    return model;
}

test('delete text, single node',function(t) {
    var model = makeSimpleTextBlock("abcdefg");
    var node = model.getRoot().child(0).child(0);
    model.deleteText(node,2,node,5);
    t.equal(model.toPlainText(),'abfg');
    t.end();
});

test('delete text, two text nodes',function(t) {
    var model = makeSimpleTextBlock("abcdefg");
    var block = model.getRoot().child(0);
    var text1 = block.child(0);
    var text2 = model.makeText('hijklmn');
    block.append(text2);
    model.deleteText(text1,1,text2,1);
    t.equal(model.toPlainText(),'aijklmn');
    t.end();
});


