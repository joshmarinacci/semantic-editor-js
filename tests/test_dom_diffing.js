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
        console.log(tab + model.type + "#"+model.id+ "." + model.style + " " + model.text);
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
    Dom.updateDomFromModel(range,VirtualDoc);
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
//delete text inside a block