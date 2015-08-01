var React = require('react');
var PostDataStore = require('./PostDataStore');
var doc = require('../src/model');
var Dom = require('../src/dom');
var dom = Dom;
var keystrokes = require('../src/keystrokes');
var MarkdownParser = require('./markdown_parser');
var Model = doc;


var u = {
    incount: 0,
    genTab: function() {
        var str = "";
        for(var i=0; i<this.incount; i++) str += "  ";
        return str;
    },
    p: function(s) {
        var args = Array.prototype.slice.call(arguments);
        console.log(this.genTab()+args.join(" "));
    },
    indent: function() {
        this.incount++;
    },
    outdent: function() {
        this.incount--;
    }
};


var dom_table = {
    'p':{
        type:doc.BLOCK,
        style:'body'
    },
    'ul':{
        type:doc.BLOCK,
        style:'unordered-list'
    },
    'ol':{
        type:doc.BLOCK,
        style:'ordered-list'
    },
    'li':{
        type:doc.BLOCK,
        style:'list-item'
    },

    'h4':{
        type:doc.BLOCK,
        style:'subheader'
    },
    'h3':{
        type:doc.BLOCK,
        style:'subheader'
    },
    'h2':{
        type:doc.BLOCK,
        style:'header'
    },
    'h1':{
        type:doc.BLOCK,
        style:'header'
    },
    'div': {
        type:doc.BLOCK,
        style:'body'
    },
    'pre': {
        type:doc.BLOCK,
        style:'block-code'
    },
    'blockquote':{
        type:doc.BLOCK,
        style:'block-quote'
    },


    '#text': {
        type:doc.TEXT,
        style:'none'
    },

    'em': {
        type:doc.SPAN,
        style:'italic'
    },
    'span': {
        type:doc.SPAN,
        style:'plain'
    },
    'strong': {
        type:doc.SPAN,
        style:'bold'
    },
    'b': {
        type:doc.SPAN,
        style:'bold'
    },
    'i': {
        type: doc.SPAN,
        style:'italic'
    },
    'a': {
        type:doc.SPAN,
        style:'link'
    },
    'strike': {
        type: doc.SPAN,
        style:'delete'
    },
    'del': {
        type:doc.SPAN,
        style:'delete'
    },
    '#comment': {
        type:'skip',
        style:'none'
    },
    'img': {
        type:doc.SPAN,
        style:'image'
    },
    'code': {
        type:doc.SPAN,
        style:'inline-code'
    }
}
function domToModel(dom,model,options) {
    var name = dom.nodeName.toLowerCase();
    if(dom.className && dom.className.length > 0) {
        var classes = dom.className.split(" ");
        classes.forEach(function(cls) {
            if(typeof options.style_to_element_map[cls] !== 'undefined') {
                //console.log("need to convert", cls ,'to',options.style_to_element_map[cls]);
                name = options.style_to_element_map[cls];
            }
        })
    }
    var def = dom_table[name];
    if(!def) {
        u.p("WARNING: We don't support '" + name + "' yet");
        return null;
    }
    if(def.type == 'skip') {
        //u.p("skipping",dom);
        return null;
    }
    if(def.type == doc.BLOCK){
        var out = model.makeBlock();
        for(var i=0; i<dom.childNodes.length; i++) {
            var node = dom.childNodes[i];
            var ch = domToModel(node,model,options);
            if(ch != null) {
                out.append(ch);
            }
        }
        out.style = def.style;
        return out;
    }
    if(def.type == doc.SPAN) {
        var out = model.makeSpan();
        for(var i=0; i<dom.childNodes.length; i++) {
            var node = dom.childNodes[i];
            var ch = domToModel(node,model,options);
            if(ch != null) {
                out.append(ch);
            }
        }
        out.style = def.style;
        if(def.style == 'link') {
            out.meta = {
                href: dom.href
            }
        }
        if(def.style == 'image') {
            out.meta = {
                src: dom.src
            }
        }
        return out;
    }
    if(def.type == doc.TEXT) {
        return model.makeText(dom.nodeValue);
    }
}
domToNewModel = function(dom_root, options) {
    if(typeof options == 'undefined') options = {
        style_to_element_map: {}
    };

    var model = doc.makeModel();
    for(var i=0; i<dom_root.childNodes.length; i++) {
        var dom_node = dom_root.childNodes[i];
        u.indent();
        var ch = domToModel(dom_node,model, options);
        if(ch == null) {
            //u.p("no child generated. ERROR?");
            continue;
        }
        //move text and span children into a block. can't be top-level
        if(ch.type == doc.TEXT || ch.type == doc.SPAN) {
            var blk = model.makeBlock();
            blk.style = 'body';
            blk.append(ch);
            model.getRoot().append(blk);
        } else {
            model.getRoot().append(ch);
        }
        u.outdent();
    }
    return model;
};


function clearChildren(root) {
    while (root.firstChild) root.removeChild(root.firstChild);
}
function renderTree(root,model) {
    clearChildren(root);
    root.appendChild(renderTreeChild(model.getRoot()));
}

function renderTreeChild(mnode) {
    var ul = document.createElement('ul');
    for(var i=0; i<mnode.childCount(); i++) {
        var li = document.createElement('li');

        var child = mnode.child(i);
        var text = child.type + " " + child.id + " " + child.style;
        li.appendChild(document.createTextNode(text));
        if(child.type == doc.TEXT) {
            li.appendChild(document.createTextNode(': "'+child.text+'"'));
        }
        if(child.childCount() > 0) {
            var child_dom = renderTreeChild(child);
            li.appendChild(child_dom);
        }
        ul.appendChild(li);
    }
    return ul;
}




var PostEditor = React.createClass({
    componentWillUpdate: function() {
        return false;
    },
    handleInput:function(e) {
        var editor = React.findDOMNode(this.refs.editor);
        var model = PostDataStore.getModel();
        var wrange = window.getSelection().getRangeAt(0);
        var doff = wrange.startOffset + Dom.domToDocumentOffset(editor,wrange.startContainer).offset;
        var pasted_container = wrange.startContainer;
        var dp1 = Dom.findDomParentWithId(pasted_container);
        var mp1 = Dom.findModelForDom(model,dp1);
        var new_mod = Dom.rebuildModelFromDom(dp1,model);
        model.swapNode(mp1,new_mod);
        var com_mod = new_mod;
        var com_dom = dp1;
        Dom.rebuildDomFromModel(com_mod,com_dom, editor, editor.ownerDocument);
        var offd = Dom.documentOffsetToDom(editor,doff);
        Dom.setCursorAtDom(offd.node, offd.offset);
        this.updateTree();
    },
    updateTree: function() {
        var tree_root = document.getElementById("modeltree");
        var model = PostDataStore.getModel();
        renderTree(tree_root,model);
    },
    componentDidMount:function() {
        var editor = React.findDOMNode(this.refs.editor);
        var model = PostDataStore.getModel();
        keystrokes.setEditor(editor);
        keystrokes.setModel(model);
        dom.syncDom(editor,model);
        editor.addEventListener("input", this.handleInput);
        keystrokes.on('change',this.updateTree);
        PostDataStore.setEditor(editor);
    },
    componentWillReceiveProps: function(props) {
        if (typeof props.post == 'undefined') return;
        var editor = React.findDOMNode(this.refs.editor);
        try {
            if(props.post.format == 'jsem') {
                var model = doc.fromJSON(props.post.raw);
                fixImages(model.getRoot());
                PostDataStore.setModel(model);
                var tree_root = document.getElementById("modeltree");
                this.updateTree();
                keystrokes.setModel(model);
                dom.syncDom(editor,model);
                return;
            }
            if(props.post.format == 'semantic') {
                console.log("doing semantic");
                dom.setRawHtml(editor,props.post.raw);
                var options = {
                    style_to_element_map:{
                        'blocktype_header':'h3'
                    }
                }
                var model = domToNewModel(editor,options);
                PostDataStore.setModel(model);
                console.log("the new model is",model);
                var tree_root = document.getElementById("modeltree");
                this.updateTree();
                keystrokes.setModel(model);
                dom.syncDom(editor,model);
                return;
            }
            if(props.post.format == 'markdown') {
                console.log("doing markdown yet");
                console.log(props.post);
                var model = MarkdownParser.parse(props.post.raw);
                console.log("the node model is",model);
                PostDataStore.setModel(model);
                var tree_root = document.getElementById("modeltree");
                this.updateTree();
                keystrokes.setModel(model);
                dom.syncDom(editor,model);
                return;
            }
            if(typeof props.post.format == 'undefined') {
                console.log("no format, must be old");
                dom.setRawHtml(editor,props.post.content);
                var model = domToNewModel(editor);
                PostDataStore.setModel(model);
                console.log("the new model is",model);
                var tree_root = document.getElementById("modeltree");
                this.updateTree();
                keystrokes.setModel(model);
                dom.syncDom(editor,model);
                return;
            }
        } catch (e) {
            console.log("error converting dataToModel");
            console.log(e);
        }
    },
    keydown: function(e) {
        keystrokes.handleEvent(e);
    },
    render: function() {
        var clss = "semantic-view grow scroll";
        if(this.props.zen) {
            clss+= " zen";
        }
        return <div
                ref="editor"
                id="post-editor"
                className={clss}
                contentEditable={true} spellCheck={false}
                    onKeyDown={this.keydown}
            ></div>
    }
});
module.exports = PostEditor;

function fixImages(root) {
    if(root.type == Model.ROOT || root.type == Model.BLOCK) {
        root.content.forEach(fixImages);
    }
    if(root.type == Model.SPAN && root.style == 'image') {
        console.log("Found an image",root.meta.src);
        var prefix = "http://localhost/images/";
        if(root.meta.src.indexOf(prefix)==0) {
            var path = root.meta.src.substring(prefix.length);
            root.meta.src = "http://joshondesign.com/images/"+path;
            console.log("changed to ",root.meta.src);
        }
    }
}

