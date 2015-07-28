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
            ownerDocument:this,
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
            classList:{
                _list:{},
                add:function(ch) {
                    this._list[ch] = ch;
                }
            },
            get id() {
                return this._id;
            },
            set id(txt) {
                var old = this._id;
                this._id = txt;
                this.ownerDocument.idChanged(old,this._id,this);
                this.ownerDocument._change_count++;
            },
            get firstChild() {
                if(this.childNodes.length >= 1) return this.childNodes[0];
                return null;
            },
            removeChild: function(ch) {
                var n = this.childNodes.indexOf(ch);
                this.childNodes.splice(n,1);
                this.ownerDocument._change_count++;
                return ch;
            }
        }
    },
    createTextNode: function(txt) {
        return {
            _nodeValue:txt,
            ownerDocument:this,
            get nodeValue() {
                return this._nodeValue;
            },
            set nodeValue(txt) {
                this._nodeValue = txt;
                this.ownerDocument._change_count++;
            },
            get id() {
                return this._id;
            },
            set id(txt) {
                var old = this._id;
                this._id = txt;
                this.ownerDocument.idChanged(old,this._id,this);
                this.ownerDocument._change_count++;
            },
            nodeType:Dom.Node.TEXT_NODE
        }
    }
};

test("insert character",function(t) {
    //make a model
    var model = makeStdModel();
    pm(model);
    var dom_root = VirtualDoc.createElement("div");
    dom_root.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);

    //modify the dom
    var sel = {
        start_node: dom_root.childNodes[0].childNodes[0],
        start_offset:0,
    };
    sel.start_node.nodeValue = 'abXc';
    sel.start_offset = 3;
    Dom.print(dom_root);

    //calculate the range of the changes
    var range = Dom.calculateChangeRange(model,dom_root,sel);

    //calculate the change list
    var changes = Dom.calculateChangeList(range);

    t.equals(changes.length,1,'only one change');
    t.equals(changes[0].mod.id,model.getRoot().child(0).child(0).id,'correct id');

    //modify the model
    Dom.applyChanges(changes,model);
    pm(model);
    t.equals(model.getRoot().child(0).child(0).text,'abXc','text updated');

    //incrementally update the dom
    var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc);
    t.equals(dom_root.child(0).child(0).nodeValue,'abXc','updated text');

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

    Model.print(model);


    var dom_root = VirtualDoc.createElement("div");
    dom_root.id = model.getRoot().id;

    //generate a dom
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);


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

    Model.print(model);

    t.equal(model.findNodeById("id_22").text,'a');
    t.equal(model.findNodeById("id_24"),null);
    t.equal(model.findNodeById("id_27"),null);
    t.equal(model.findNodeById("id_29").text,'pqr');

    var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
    t.equals(com_mod.id,block1.id,'common parent id');
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc);
    Dom.print(dom_root);
    t.end();
});

test("calculate common parent path",function(t) {
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
    var dom_root = VirtualDoc.createElement("div");
    dom_root.id="editor";
    Dom.modelToDom(model,dom_root,VirtualDoc);


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
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc);
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


test("selection to bold",function(t) {
    var model = Model.makeModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abcdefghi");
    block1.append(text1);
    model.getRoot().append(block1);
    Model.print(model);
    var dom_root = VirtualDoc.createElement("div");
    dom_root.id="editor";
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);

    var range = makeTextSubsetRange(text1,3,6, dom_root);
    var changes = Dom.makeStyleTextRange(range,model,'bold');
    var com_mod = range.start.mod.getParent();
    console.log('changes',changes);
    Dom.applyChanges(changes,model);
    Model.print(model);
    //var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    console.log("common = ", com_mod.id);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc);
    Dom.print(dom_root);
    t.end();
});

test("delete after text",function(t) {
    var model = Model.makeModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abc");
    block1.append(text1);
    var span = model.makeBlock();
    var text2 = model.makeText('def');
    span.append(text2);
    block1.append(span);
    var text3 = model.makeText('ghi');
    block1.append(text3);
    model.getRoot().append(block1);
    Model.print(model);
    var dom_root = VirtualDoc.createElement("div");
    dom_root.id="editor";
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);

    var range = {
        start: {
            mod: text3,
            dom: Dom.findDomForModel(text3,dom_root),
            offset:1
        },
        end: {
            mod: text3,
            dom: Dom.findDomForModel(text3,dom_root),
            offset:2
        }
    };

    var changes = Dom.makeDeleteTextRange(range,model);
    console.log('changes',changes);
    Dom.applyChanges(changes,model);
    Model.print(model);
    var com_mod = range.start.mod.getParent();
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    console.log("common = ", com_mod.id);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc);
    Dom.print(dom_root);
    t.end();
});


test("delete selection across block boundaries", function(t) {
    //make model
    var model = Model.makeModel();
    var block1 = model.makeBlock();
    var text1  = model.makeText("abc");
    block1.append(text1);
    model.getRoot().append(block1);
    var block2 = model.makeBlock();
    var text2  = model.makeText("def");
    block2.append(text2);
    model.getRoot().append(block2);
    Model.print(model);

    //make dom
    var dom_root = VirtualDoc.createElement("div");
    dom_root.id = model.getRoot().id;
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);

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
    Model.print(model);
    t.equal(changes.length,4,'change count');

    t.equal(model.findNodeById("id_62").text,'a');
    t.equal(model.findNodeById("id_63"),null);
    t.equal(model.findNodeById("id_64").text,'ef');

    t.equals(com_mod.id,model.getRoot().id,'common parent id');
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, VirtualDoc);
    Dom.print(dom_root);
    t.end();
});

test("split block in half w/ text", function(t) {
    //make model
    var model = Model.makeModel();
    var block1 = model.makeBlock();
    var text1 = model.makeText("abc");
    block1.append(text1);
    model.getRoot().append(block1);
    Model.print(model);

    var dom_root = VirtualDoc.createElement("div");
    dom_root.id = model.getRoot().id;
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);

    var range = {
        start: {
            mod: text1,
            offset:1
        }
    };
    //var com_mod = findBlockParent(range.start.mod).getParent();
    var changes = Dom.makeSplitChange(range,model);
    console.log("changes = ", changes);
    Dom.applyChanges(changes,model);
    Model.print(model);
    t.equal(model.getRoot().child(0).childCount(),1);
    t.end();

});

test("split block in half w/ span and more text", function(t) {
    //make model
    var model = Model.makeModel();
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
    Model.print(model);

    var dom_root = VirtualDoc.createElement("div");
    dom_root.id = model.getRoot().id;
    Dom.modelToDom(model,dom_root,VirtualDoc);
    Dom.print(dom_root);

    var range = {
        start: {
            mod: text2,
            offset:1
        }
    };
    //var com_mod = findBlockParent(range.start.mod).getParent();
    var changes = Dom.makeSplitChange(range,model);
    console.log("changes = ", changes);
    Dom.applyChanges(changes,model);
    Model.print(model);
    t.end();
});

/*
 unit tests for

split block with enter key and unit test
    //make a split-block change type which invokes the older model.splitBlockAt
    set cursor after deletion
    set cursor after split block?
    set cursor after style change?
    set cursor after insertion
    short cut to clear all styles in selection
    doing bold again will undo bold if already set at the cursor point
    prove the image doesn't flicker
    preload with list, prove i can split it correctly (nested blocks case)





    splitting block with enter key. reuse existing splitBlockAt code
     set cursor after delete backwards
     set cursor after delete forwards
     set cursor after delete selection
     //move Dom.domToNewModel to code specific to blog editor

    deleting backwards across text->span boundary. update existing test
    //deleting backwards across block boundary. update existing test
    //delete selection across block boundaries. update existing test
    //delete selection across span boundaries. update existing test

    //implement delete backwards keystroke using selection delete
    //implement delete forwards keystroke using selection delete


    comment out scan for changes
 */

//add in keystroke for enter.
//test with an image to see if it doesn't refresh the image
//unit test for converting a selection into a bold span. should use a change list
//clean up code

//move Dom.domToNewModel to code specific to blog editor
//do we use scan for changes anymore? just to handle copy & paste? needs a unit test
//then shower and food