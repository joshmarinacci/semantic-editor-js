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
/*
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
*/
/*
function randomTree() {
    var model = doc.makeModel();
    var root = model.getRoot();
    var familySize = Math.floor(Math.random()*4);
    for(var i=0; i<familySize; i++) {
        var block = model.makeBlock();
        root.append(block);
        randomTreeHelper(model,block,1);
    }
    return model;
}

function randomTreeHelper(model,root,depth) {
    var familySize = Math.floor(Math.random()*4);
    for(var i=0; i<familySize; i++) {
        if(i%2 == 0) {
            root.append(model.makeText("some text"));
        } else {
            var span = model.makeSpan();
            root.append(span);
            span.append(model.makeText("some text"));
        }
    }
}
*/

test('iterator',function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    var text1 = model.makeText("foo");
    block1.append(text1);
    var text2 = model.makeText("bar");
    block1.append(text2);
    model.append(block1);

    var block2 = model.makeBlock();
    model.append(block2);
    var text3 = model.makeText('baz');
    block2.append(text3);

    var it = model.getIterator(model.getRoot().child(0));
    var total = 0;
    while(it.hasNext()) {
        var node = it.next();
        if(node.type == doc.TEXT) {
            total+= node.text.length;
        }
    }
    t.equal(model.countCharacters(),total);
    t.end();
});

function dumpTree(root,indent) {
    if(!indent) indent = "";
    if(root.type == doc.TEXT) {
        console.log(indent+root.id+" "+root.type+" '"+root.text+"'");
    }else {
        console.log(indent + root.id+" "+root.type);
    }
    if(root.content) {
        root.content.forEach(function(node) {
            dumpTree(node,indent + "  ");
        })
    }
}

test("delete text across two blocks w/ text inbetween", function(t) {
    var model = makeSimpleTextBlock("abcdefg");
    var block1 = model.getRoot().child(0);
    var text1  = block1.child(0);
    var text1a = model.makeText("hijklmnop");
    block1.append(text1a);

    var block2 = model.makeBlock();
    var text2 = model.makeText("qrstuvwxyz");
    block2.append(text2);
    model.append(block2);

    model.deleteText(text1,1,text2,9);
    t.equal(model.toPlainText(),'az');
    t.end();
});

test("delete text across three blocks w/ text inbetween", function(t) {
    var model = makeSimpleTextBlock("abc");
    var block1 = model.getRoot().child(0);
    var text1  = block1.child(0);
    var text1a = model.makeText("def");
    block1.append(text1a);

    var block2 = model.makeBlock();
    var text2 = model.makeText("ghi");
    block2.append(text2);
    model.append(block2);

    var block3 = model.makeBlock();
    var text3 = model.makeText("jkl");
    block3.append(text3);
    model.append(block3);

    model.deleteText(text1,1,text3,2);
    t.equal(model.toPlainText(),'al');
    t.end();
});

test("delete text across spans", function(t) {
    var model = makeSimpleTextBlock("abc");
    var block1 = model.getRoot().child(0);
    var text1  = block1.child(0);
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


    model.deleteText(text1,1,text1ca,3);
    t.equal(model.toPlainText(),'apqrstuvwx');
    t.end();
});

test('split in middle text', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    model.getRoot().append(block1);
    block1.append(model.makeText("abc"));
    block1.append(model.makeText("def"));
    block1.append(model.makeText("ghi"));

    model.splitBlockAt(block1.child(1),1);
    t.equal(model.toPlainText(),"abcdefghi");
    t.equal(model.getRoot().childCount(),2);
    t.equal(model.getRoot().child(0).childCount(),2);
    t.equal(model.getRoot().child(0).child(0).text, 'abc');
    t.equal(model.getRoot().child(0).child(1).text, 'd');
    t.equal(model.getRoot().child(1).child(0).text, 'ef');
    t.equal(model.getRoot().child(1).child(1).text, 'ghi');

    t.end();
});

test('delete an empty text element', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    model.getRoot().append(block1);
    block1.append(model.makeText("abc"));

    var block2 = model.makeBlock();
    model.getRoot().append(block2);
    block2.append(model.makeText("def"));

    var end_node = block2.child(0);
    var end_offset = 0;
    var start_node = model.getPreviousTextNode(end_node);
    var start_offset = start_node.text.length-1;
    t.equal(start_node.text,"abc");
    t.equal(start_offset,2);
    model.deleteText(start_node,start_offset,end_node,end_offset);
    t.equal(model.toPlainText(),"abdef");
    t.end();
});

test('delete an empty text element 2', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    model.getRoot().append(block1);
    block1.append(model.makeText("abc"));

    var block2 = model.makeBlock();
    model.getRoot().append(block2);
    block2.append(model.makeText(""));

    var end_node = block2.child(0);
    var end_offset = 0;
    var start_node = model.getPreviousTextNode(end_node);
    var start_offset = start_node.text.length-1;
    t.equal(start_node.text,"abc");
    t.equal(start_offset,2);
    model.deleteText(start_node,start_offset,block2,0);
    t.equal(model.toPlainText(),"ab");
    t.equal(model.getRoot().childCount(),1);
    t.end();
});

test('delete forwards',function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    model.getRoot().append(block1);
    block1.append(model.makeText("abc"));
    var start_node = block1.child(0);
    var start_offset = 1;
    var pos = model.deleteTextForwards(start_node,start_offset);
    t.equal(model.toPlainText(),'ac');
    t.equal(pos.node, start_node);
    t.equal(pos.offset,start_offset);
    t.end();
});


test('delete forwards text start',function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    model.getRoot().append(block1);
    block1.append(model.makeText("abc"));
    block1.append(model.makeText("def"));

    var start_node = block1.child(0);
    var start_offset = 3;
    var pos = model.deleteTextForwards(start_node,start_offset);
    t.equal(model.toPlainText(),'abcef');
    t.equal(pos.node, start_node);
    t.equal(pos.offset,start_offset);
    t.end();
});

test('delete forwards span start',function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    model.getRoot().append(block1);
    block1.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.append(model.makeText("def"));
    block1.append(span);
    block1.append(model.makeText("ghi"));

    var start_node = block1.child(0);
    var start_offset = 2;
    var pos = model.deleteTextForwards(start_node,start_offset);
    t.equal(model.toPlainText(),'abdefghi');
    var pos = model.deleteTextForwards(start_node,start_offset);
    t.equal(model.toPlainText(),'abefghi');
    var pos = model.deleteTextForwards(start_node,start_offset);
    var pos = model.deleteTextForwards(start_node,start_offset);
    t.equal(model.toPlainText(),'abghi');
    t.equal(pos.node, start_node);
    t.equal(pos.offset,start_offset);
    t.equal(block1.childCount(),2);
    t.end();
});

test('delete forwards across blocks', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    model.getRoot().append(block1);
    var block2 = model.makeBlock();
    block2.append(model.makeText("def"));
    model.getRoot().append(block2);
    var start_node = block1.child(0);
    var start_offset = 2;
    var pos = model.deleteTextForwards(start_node,start_offset);
    var pos = model.deleteTextForwards(start_node,start_offset);
    t.equal(model.toPlainText(),"abef");
    t.equal(model.getRoot().childCount(),1);

    t.end();
});
test('delete forwards across three blocks', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    model.getRoot().append(block1);
    var block2 = model.makeBlock();
    block2.append(model.makeText("T"));
    model.getRoot().append(block2);
    var block3 = model.makeBlock();
    block3.append(model.makeText("def"));
    model.getRoot().append(block3);

    dumpTree(model.getRoot());
    var start_node = block1.child(0);
    var start_offset = 3;
    var pos = model.deleteTextForwards(start_node,start_offset);
    dumpTree(model.getRoot());
    t.equal(model.toPlainText(),"abcdef");
    var pos = model.deleteTextForwards(start_node,start_offset);
    dumpTree(model.getRoot());
    t.equal(model.toPlainText(),"abcef");
    t.equal(model.getRoot().childCount(),1);
    t.end();
});

test('delete backwards across blocks', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    model.getRoot().append(block1);
    var block2 = model.makeBlock();
    block2.append(model.makeText("def"));
    model.getRoot().append(block2);

    var start_node = block2.child(0);
    var start_offset = 1;
    dumpTree(model.getRoot());
    var pos = model.deleteTextBackwards(start_node,start_offset);
    dumpTree(model.getRoot());
    var pos = model.deleteTextBackwards(pos.node,pos.offset);
    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abef");
    t.equals(model.getRoot().childCount(),1);
    t.equals(pos.node,block1.child(0));
    t.equals(pos.offset,2);
    t.end();
});

test('delete backwards across short block', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    model.getRoot().append(block1);
    var block2 = model.makeBlock();
    block2.append(model.makeText("T"));
    model.getRoot().append(block2);
    var block3 = model.makeBlock();
    block3.append(model.makeText("def"));
    model.getRoot().append(block3);

    var start_node = block2.child(0);
    var start_offset = 1;
    dumpTree(model.getRoot());
    var pos = model.deleteTextBackwards(start_node,start_offset);
    dumpTree(model.getRoot());
    var pos = model.deleteTextBackwards(pos.node,pos.offset);
    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abdef");
    t.equals(model.getRoot().childCount(),2);
    t.equals(pos.node,block1.child(0));
    t.equals(pos.offset,2);
    t.end();
});

test('delete backwards with empty text node in the middle',function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    model.getRoot().append(block1);

    var block2 = model.makeBlock();
    block2.append(model.makeText("T"));
    block2.append(model.makeText("def"));
    model.getRoot().append(block2);
    dumpTree(model.getRoot());
    var pos = model.deleteTextBackwards(block2.child(1),0);
    dumpTree(model.getRoot());
    var pos = model.deleteTextBackwards(pos.node,pos.offset);
    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abdef");

    t.end();
})



test('delete backwards, remove empty span', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.append(model.makeText(""));
    block1.append(span);
    block1.append(model.makeText("def"));
    model.getRoot().append(block1);

    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abcdef");
    t.equals(block1.childCount(),3);
    model.deleteTextBackwards(block1.child(2),0);
    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abdef");
    t.equals(block1.childCount(),2);

    t.end();

})
test('delete backwards, remove empty span alt', function(t) {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    block1.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.append(model.makeText(""));
    block1.append(span);
    block1.append(model.makeText("def"));
    model.getRoot().append(block1);

    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abcdef");
    t.equals(block1.childCount(),3);
    model.deleteTextBackwards(block1.child(0),3);
    dumpTree(model.getRoot());
    t.equals(model.toPlainText(),"abdef");
    t.equals(block1.childCount(),2);

    t.end();

})