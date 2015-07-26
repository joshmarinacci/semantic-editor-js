var React = require('react');
var PostDataStore = require('./PostDataStore');
var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');
var MarkdownParser = require('./markdown_parser');


var PostEditor = React.createClass({
    componentWillUpdate: function() {
        return false;
    },
    componentDidMount:function() {
        var editor = React.findDOMNode(this.refs.editor);
        var model = PostDataStore.getModel();
        keystrokes.setEditor(editor);
        keystrokes.setModel(model);
        dom.syncDom(editor,model);
        editor.addEventListener("input", keystrokes.handleBrowserInputEvent, false);
        keystrokes.on('change',function(){
            var tree_root = document.getElementById("modeltree");
            var model = PostDataStore.getModel();
            dom.renderTree(tree_root,model);
        });
        PostDataStore.setEditor(editor);
    },
    componentWillReceiveProps: function(props) {
        if (typeof props.post == 'undefined') return;
        var editor = React.findDOMNode(this.refs.editor);
        try {
            if(props.post.format == 'jsem') {
                var model = doc.fromJSON(props.post.raw);
                PostDataStore.setModel(model);
                var tree_root = document.getElementById("modeltree");
                dom.renderTree(tree_root,model);
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
                var model = dom.domToNewModel(editor,options);
                PostDataStore.setModel(model);
                console.log("the new model is",model);
                var tree_root = document.getElementById("modeltree");
                dom.renderTree(tree_root,model);
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
                dom.renderTree(tree_root,model);
                keystrokes.setModel(model);
                dom.syncDom(editor,model);
                return;
            }
            if(typeof props.post.format == 'undefined') {
                console.log("no format, must be old");
                dom.setRawHtml(editor,props.post.content);
                var model = dom.domToNewModel(editor);
                PostDataStore.setModel(model);
                console.log("the new model is",model);
                var tree_root = document.getElementById("modeltree");
                dom.renderTree(tree_root,model);
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
        return <div ref="editor" id="post-editor" className="semantic-view grow scroll" contentEditable={true} spellCheck={false}
                    onKeyDown={this.keydown}
            ></div>
    }
});
module.exports = PostEditor;