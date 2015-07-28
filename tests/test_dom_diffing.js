/**
 * Created by josh on 7/27/15.
 */
var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');

function makeStdModel() {
    var model = Model.makeModel();
    var block = model.makeBlock();
    var text  = model.makeText("abc");
    block.append(text);
    model.getRoot().append(block);
    return model;
}

function pm(model,tab) {
    if(!tab) tab = "";
    if(model.getRoot) return pm(model.getRoot(),"");
    if(model.type == Model.TEXT) {
        console.log(tab + model.type + "#"+model.id+ "." + model.style + " '" + model.text+"'");
        return;
    }
    console.log(tab + model.type + "#"+model.id+ "." + model.style);
    if(model.childCount() > 0) {
        model.content.forEach(function(node){
            pm(node,tab+"  ");
        })
    }
}


var VirtualDoc = {
    _change_count:0,
    _ids:{},
    idChanged: function(old_id, new_id, node) {
        delete this._ids[old_id];
        this._ids[new_id] = node;
    },
    getElementById: function(id) {
        return this._ids[id];
    },
    resetChangeCount: function() {
        this._change_count = 0;
    },
    getChangeCount: function() {
        return this._change_count;
    },
    createElement:function(name) {
        return {
            document:this,
            nodeName: name,
            nodeType:Dom.Node.ELEMENT_NODE,
            childNodes:[],
            child: function(i) {
                return this.childNodes[i];
            },
            appendChild: function(ch) {
                this.childNodes.push(ch);
                ch.parentNode = this;
            },
            insertBefore: function(newNode, referenceNode) {
                var n = this.childNodes.indexOf(referenceNode);
                this.childNodes.splice(n,0,newNode);
                newNode.parentNode = this;
            },
            get id() {
                return this._id;
            },
            set id(txt) {
                var old = this._id;
                this._id = txt;
                this.document.idChanged(old,this._id,this);
                this.document._change_count++;
            },
            removeChild: function(ch) {
                var n = this.childNodes.indexOf(ch);
                this.childNodes.splice(n,1);
                this.document._change_count++;
                return ch;
            }
        }
    },
    createTextNode: function(txt) {
        return {
            _nodeValue:txt,
            document:this,
            get nodeValue() {
                return this._nodeValue;
            },
            set nodeValue(txt) {
                this._nodeValue = txt;
                this.document._change_count++;
            },
            get id() {
                return this._id;
            },
            set id(txt) {
                var old = this._id;
                this._id = txt;
                this.document.idChanged(old,this._id,this);
                this.document._change_count++;
            },
            nodeType:Dom.Node.TEXT_NODE
        }
    }
};








test("insert character",function(t) {
    //make a model
    var model = makeStdModel();
    pm(model);
    var dom = VirtualDoc.createElement("div");
    dom.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom,VirtualDoc);
    Dom.print(dom);

    //modify the dom
    var sel = {
        start_node: dom.childNodes[0].childNodes[0],
        start_offset:0,
    };
    sel.start_node.nodeValue = 'abXc';
    sel.start_offset = 3;
    Dom.print(dom);

    //calculate the range of the changes
    var range = Dom.calculateChangeRange(model,dom,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    t.equals(changes.length,1,'only one change');
    t.equals(changes[0].mod.id,model.getRoot().child(0).child(0).id,'correct id');

    //modify the model
    Dom.applyChanges(changes,model);
    pm(model);
    t.equals(model.getRoot().child(0).child(0).text,'abXc','text updated');

    //incrementally update the dom
    VirtualDoc.resetChangeCount();
    Dom.updateDomFromModel(range,model, dom, VirtualDoc);
    t.equals(VirtualDoc.getChangeCount(),1,'change count');
    t.equals(dom.child(0).child(0).nodeValue,'abXc','updated text');

    t.end();
});

test('insert text before span',function(t) {
    var model = Model.makeModel();
    var block = model.makeBlock();
    model.getRoot().append(block);
    //block.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.style = 'link';
    span.append(model.makeText("def"));
    block.append(span);
    block.append(model.makeText("ghi"));


    pm(model);

    var dom = VirtualDoc.createElement("div");
    dom.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom,VirtualDoc);
    Dom.print(dom);


    //modify the dom
    dom.childNodes[0].insertBefore(
        VirtualDoc.createTextNode("XXX"),
        dom.childNodes[0].childNodes[0]
    );
    Dom.print(dom);
    //create selection at the change
    var sel = {
        start_node: dom.childNodes[0].childNodes[0],
        start_offset:2
    };
    var range = Dom.calculateChangeRange(model,dom,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    //modify the model
    Dom.applyChanges(changes,model);
    pm(model);
    t.equals(model.getRoot().child(0).child(0).text,'XXX','text inserted');
    t.end();
});

test('insert text inside span',function(t) {
    var model = Model.makeModel();
    var block = model.makeBlock();
    model.getRoot().append(block);
    //block.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.style = 'link';
    span.append(model.makeText("def"));
    block.append(span);
    block.append(model.makeText("ghi"));


    pm(model);

    var dom = VirtualDoc.createElement("div");
    dom.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom,VirtualDoc);
    Dom.print(dom);


    //modify the dom
    var ch = dom.childNodes[0].childNodes[0].childNodes[0];
    ch.nodeValue = ch.nodeValue.substring(0,1)
        +'x'
        +ch.nodeValue.substring(1);
    Dom.print(dom);
    //create selection at the change
    var sel = {
        start_node: dom.childNodes[0].childNodes[0].childNodes[0],
        start_offset:2,
    };

    var range = Dom.calculateChangeRange(model,dom,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    //modify the model
    Dom.applyChanges(changes,model);
    pm(model);
    t.equals(model.getRoot().child(0).child(0).child(0).text,'dxef','text inserted');
    t.end();
});

test('insert text after span',function(t) {
    var model = Model.makeModel();
    var block = model.makeBlock();
    model.getRoot().append(block);
    //block.append(model.makeText("abc"));
    var span = model.makeSpan();
    span.style = 'link';
    span.append(model.makeText("def"));
    block.append(span);
    block.append(model.makeText("ghi"));


    pm(model);

    var dom = VirtualDoc.createElement("div");
    dom.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom,VirtualDoc);
    Dom.print(dom);

    //modify the dom
    var ch = dom.childNodes[0].childNodes[1];
    ch.nodeValue = ch.nodeValue.substring(0,1)
        +'x'
        +ch.nodeValue.substring(1);
    Dom.print(dom);
    //create selection at the change
    var sel = {
        start_node: ch,
        start_offset:2
    };

    var range = Dom.calculateChangeRange(model,dom,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    //modify the model
    Dom.applyChanges(changes,model);
    pm(model);
    t.equals(model.getRoot().child(0).child(1).text,'gxhi','text inserted');
    t.end();
});

//delete text inside a span (should already work)


test("delete text across spans", function(t) {
    var model = Model.makeModel();
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
    pm(model);


    var dom = VirtualDoc.createElement("div");
    dom.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom,VirtualDoc);
    Dom.print(dom);


    var range = {
        start: {
            dom:Dom.findDomForModel(text1,dom),
            mod:text1,
            offset:1,
        },
        end:{
            dom:Dom.findDomForModel(text1ca,dom),
            mod:text1ca,
            offset:3,
        }
    };

    t.equals(range.start.dom.nodeValue,'abc');
    t.equals(range.end.dom.nodeValue,'mno');

    function makeDeleteTextRange(range) {
        var changes = [];
        changes.push({
            type:'text-change',
            mod: range.start.mod,
            text: range.start.mod.text.substring(0,range.start.offset)
        });
        var it = model.getIterator(range.start.mod);
        while(it.hasNext()) {
            var ch = it.next();
            console.log("next =", ch.id);
            if(ch == range.end.mod) {
                console.log("changing and done");
                changes.push({
                    type:'text-change',
                    mod: range.end.mod,
                    text: range.end.mod.text.substring(range.end.offset)
                });
                break;
            }
            if(ch.type == Model.TEXT) {
                console.log('deleting');
                changes.push({
                    type:'delete',
                    mod: ch
                });
            }
        }
        return changes;
    }
    var changes = makeDeleteTextRange(range);
    Dom.applyChanges(changes,model);
    t.equal(changes.length,5,'change count');

    t.equal(model.findNodeById("id_22").text,'a');
    t.equal(model.findNodeById("id_24"),null);
    t.equal(model.findNodeById("id_27"),null);
    t.equal(model.findNodeById("id_29").text,'pqr');

    pm(model);
    Dom.print(dom);
    //now update the model back
    VirtualDoc.resetChangeCount();
    Dom.updateDomFromModel(range,model, dom,VirtualDoc);
    Dom.print(dom);
    t.equals(VirtualDoc.getChangeCount(),7,'change count');

    t.end();
});

//delete text inside a block


//add in keystroke for backspace
//add in keystroke for enter
//style everything on screen properly
//make sure styles of spans and blocks are propagated to the dom updates
//test with an image to see if it doesn't refresh the image

