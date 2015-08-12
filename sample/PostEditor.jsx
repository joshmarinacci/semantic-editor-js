var React = require('react');
var PostDataStore = require('./PostDataStore');
var Model = require('../src/model');
var Dom = require('../src/dom');
var Keystrokes = require('../src/keystrokes');
var MarkdownParser = require('./markdown_parser');

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
        type:Model.BLOCK,
        style:'body'
    },
    'ul':{
        type:Model.BLOCK,
        style:'unordered-list'
    },
    'ol':{
        type:Model.BLOCK,
        style:'ordered-list'
    },
    'li':{
        type:Model.BLOCK,
        style:'list-item'
    },

    'h4':{
        type:Model.BLOCK,
        style:'subheader'
    },
    'h3':{
        type:Model.BLOCK,
        style:'subheader'
    },
    'h2':{
        type:Model.BLOCK,
        style:'header'
    },
    'h1':{
        type:Model.BLOCK,
        style:'header'
    },
    'div': {
        type:Model.BLOCK,
        style:'body'
    },
    'pre': {
        type:Model.BLOCK,
        style:'block-code'
    },
    'blockquote':{
        type:Model.BLOCK,
        style:'block-quote'
    },


    '#text': {
        type:Model.TEXT,
        style:'none'
    },

    'em': {
        type:Model.SPAN,
        style:'italic'
    },
    'span': {
        type:Model.SPAN,
        style:'plain'
    },
    'strong': {
        type:Model.SPAN,
        style:'bold'
    },
    'b': {
        type:Model.SPAN,
        style:'bold'
    },
    'i': {
        type: Model.SPAN,
        style:'italic'
    },
    'a': {
        type:Model.SPAN,
        style:'link'
    },
    'strike': {
        type: Model.SPAN,
        style:'delete'
    },
    'del': {
        type:Model.SPAN,
        style:'delete'
    },
    '#comment': {
        type:'skip',
        style:'none'
    },
    'img': {
        type:Model.SPAN,
        style:'image'
    },
    'code': {
        type:Model.SPAN,
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
    if(def.type == Model.BLOCK){
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
    if(def.type == Model.SPAN) {
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
    if(def.type == Model.TEXT) {
        return model.makeText(dom.nodeValue);
    }
}
domToNewModel = function(dom_root, options) {
    if(typeof options == 'undefined') options = {
        style_to_element_map: {}
    };

    var model = Model.makeModel();
    for(var i=0; i<dom_root.childNodes.length; i++) {
        var dom_node = dom_root.childNodes[i];
        u.indent();
        var ch = domToModel(dom_node,model, options);
        if(ch == null) {
            //u.p("no child generated. ERROR?");
            continue;
        }
        //move text and span children into a block. can't be top-level
        if(ch.type == Model.TEXT || ch.type == Model.SPAN) {
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
var PostEditor = React.createClass({
    componentWillUpdate: function() {
        return false;
    },
    componentDidMount:function() {
        var editor = PostDataStore.getRealEditor();
        editor.setDomRoot(React.findDOMNode(this.refs.editor));
    },
    componentWillReceiveProps: function(props) {
    },
    render: function() {
        var clss = "semantic-view grow scroll";
        return <div
                ref="editor"
                id="post-editor"
                className={clss}
                contentEditable={true} spellCheck={false}
            ></div>
    }
});
module.exports = PostEditor;
