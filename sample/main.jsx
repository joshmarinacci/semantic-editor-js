var React = require('react');

var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');
var moment = require('moment');
var PostDataStore = require('./PostDataStore');
var PostMeta = require('./PostMeta.jsx');
var utils = require('./utils');

var model = doc.makeModel();
var std_styles = {
    block:{
        //name of style : css classname
        header:'header',
        subheader:'subheader',
        body:'body',
        'block-code':'block-code',
        'block-quote':'block-quote'
    },
    inline: {
        bold:'bold',
        italic:'italic',
        'inline-code':'inline-code',
        link:'link',
        subscript:'subscript',
        superscript:'superscript'
    }
};

model.setStyles(std_styles);
function setupModel(model) {
    var block1 = model.makeBlock();
    var text1 = model.makeText("This is an empty post. please create a new one.");
    block1.append(text1);
    model.append(block1);
    return model;
}
var model = setupModel(model);

function dumpModel(root,tab) {
    console.log(tab+root.type+"  "+root.id);
    if(!root.isEmpty()) {
        if(root.content) root.content.forEach(function(node) {
            dumpModel(node,tab+"  ");
        });
        if(root.type == 'text') console.log(tab+' ---  ' + root.text);
    }
}

function dumpStringAscii(str) {
    console.log("dumping string",str);
    for(var i=0; i<str.length; i++) {
        console.log(str[i], str.charCodeAt(i));
    }
}

var PostItem = React.createClass({
    selectPost: function(e) {
        PostDataStore.selectById(this.props.post.id);
    },
    render: function() {
        return <li><a href='#' onClick={this.selectPost}>{this.props.post.title}</a></li>
    }
});

var PostList = React.createClass({
    render: function() {
        var self = this;
        var posts = this.props.posts.map(function(post){
            return <PostItem key={post.id} post={post}/>
        });
        return <ul className='scroll' id="post-list">{posts}</ul>
    }
});


var PostEditor = React.createClass({
    componentWillUpdate: function() {
        return false;
    },
    componentDidMount:function() {
        var editor = React.findDOMNode(this.refs.editor);
        keystrokes.setEditor(editor);
        keystrokes.setModel(model);
        dom.syncDom(editor,model);
        editor.addEventListener("input", keystrokes.handleBrowserInputEvent, false);
        keystrokes.on('change',function(){
            var tree_root = document.getElementById("modeltree");
            dom.renderTree(tree_root,model);
        });
        PostDataStore.setEditor(editor);
    },
    componentWillReceiveProps: function(props) {
        if (typeof props.post == 'undefined') return;
        var editor = React.findDOMNode(this.refs.editor);
        try {
            if(props.post.format == 'jsem') {
                model = doc.fromJSON(props.post.raw);
                model.setStyles(std_styles);
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
                model = dom.domToNewModel(editor,options);
                model.setStyles(std_styles);
                console.log("the new model is",model);
                var tree_root = document.getElementById("modeltree");
                dom.renderTree(tree_root,model);
                keystrokes.setModel(model);
                dom.syncDom(editor,model);
                return;
            }
            if(props.post.format == 'markdown') {
                console.log("not doing markdown yet");
                return;
            }
            if(typeof props.post.format == 'undefined') {
                console.log("no format, must be old");
                dom.setRawHtml(editor,props.post.content);
                model = dom.domToNewModel(editor);
                model.setStyles(std_styles);
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


var BlockDropdown = React.createClass({
    getInitialState: function() {
        return {
            open:false
        }
    },
    toggleDropdown: function() {
        this.setState({
            open:!this.state.open
        })
    },
    selectedStyle: function(name,e) {
        if(this.props.type == 'block') {
            keystrokes.changeBlockStyle(model.getStyles().block[name]);
        }
        if(this.props.type == 'inline') {
            keystrokes.styleSelectionInline(model.getStyles().inline[name]);
        }
        this.setState({open:false})
    },
    render: function() {
        var openClass = utils.toClass(["btn-group"],{ open:this.state.open });
        var buttonClass = utils.toClass(["btn","btn-default","dropdown-toggle"]);
        var styles = this.props.styles;
        var items = [];
        for(var name in styles) {
            items.push(<li key={name}><a href='#' onClick={this.selectedStyle.bind(this,name)}>{name}</a></li>);
        }
        return <div className={openClass}>
                <button type="button" className={buttonClass} onClick={this.toggleDropdown}>
                    {this.props.type} <span className="caret"></span>
                </button>
                <ul className="dropdown-menu">{items}</ul>
            </div>
    }
});

function deleteEmptyText(root) {
    if(root.childCount() > 0) {
        root.content.forEach(deleteEmptyText);
    }
    if(root.type == doc.TEXT && root.text.trim().length == 0) {
        console.log("found some text to delete");
        root.deleteFromParent();
    }
}
function deleteEmptyBlocks(root) {
    if(root.childCount() > 0) {
        root.content.forEach(deleteEmptyBlocks);
    } else {
        if(root.type == doc.BLOCK) {
            console.log("found an empty block");
            root.deleteFromParent();
        }
    }
}

function convertPlainSpans(root) {
    if(root.type == doc.SPAN && root.style == 'plain') {
        if(root.childCount() == 1) {
            model.swapNode(root,root.child(0));
            return;
        }
        return;
    }
    if(root.childCount() > 0) {
        root.content.forEach(convertPlainSpans);
    }
}

function mergeAdjacentText(root) {
    if(root.type == doc.TEXT) return;
    if(root.childCount() <= 1) return;

    var child = root.child(0);
    var i=1;
    while(i<root.childCount()) {
        var chnext = root.child(i);
        if(child.type == doc.TEXT && chnext.type == doc.TEXT) {
            child.text = child.text + chnext.text;
            chnext.deleteFromParent();
        } else {
            i++;
            child = chnext;
        }
    }
    root.content.forEach(mergeAdjacentText);
}

var CleanupDropdown = React.createClass({
    getInitialState: function() {
        return {
            open:false
        }
    },
    toggleDropdown: function() {
        this.setState({
            open:!this.state.open
        })
    },
    removeEmptyBlocks: function() {
        console.log("removing the empty blocks",model);
        deleteEmptyBlocks(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    removeEmptyText: function() {
        deleteEmptyText(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    removePlainSpans: function() {
        convertPlainSpans(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    mergeAdjacentText: function() {
        mergeAdjacentText(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    render: function() {
        var openClass = utils.toClass(["btn-group"],{ open:this.state.open });
        var buttonClass = utils.toClass(["btn","btn-default","dropdown-toggle"]);
        return <div className={openClass}>
            <button type="button" className={buttonClass} onClick={this.toggleDropdown}>
                    clean up <span className="caret"></span>
            </button>
            <ul className="dropdown-menu">
                <li><a href='#' onClick={this.removeEmptyBlocks}>remove empty blocks</a></li>
                <li><a href='#' onClick={this.removeEmptyText}>remove empty text</a></li>
                <li><a href='#' onClick={this.removePlainSpans}>remove plain spans</a></li>
                <li><a href='#' onClick={this.mergeAdjacentText}>merge adjacent text</a></li>
            </ul>
        </div>
    }
})


var Toolbar = React.createClass({
    getInitialState: function() {
        return {
            styles:{
                block:[],
                inline:[]
            },
        }
    },
    componentDidMount: function() {
        var self = this;
        PostDataStore.on('selected',function() {
            self.setState({
                styles:model.getStyles()
            });
        });
    },
    setModelToPost: function() {
        var data = model.toJSON();
        PostDataStore.updateContent(this.props.post,data);
    },
    doNewPost: function() {
        PostDataStore.makeNewPost();
    },
    doDeletePost: function() {
        PostDataStore.deletePost(PostDataStore.getSelected());
    },
    render: function() {
        return <div className='grow' id="toolbar">
            <BlockDropdown styles={this.state.styles.block} type="block"/>
            <BlockDropdown styles={this.state.styles.inline} type="inline"/>
            <CleanupDropdown/>
            <button className="btn btn-default" onClick={this.setModelToPost}>Save</button>
            <button className="btn btn-default" onClick={this.doNewPost}>New</button>
            <button className="btn btn-default" onClick={this.doDeletePost}>Delete</button>
        </div>
    }
});

var MainView = React.createClass({
    getInitialState: function() {
        return {
            posts: PostDataStore.getPosts(),
            selected: PostDataStore.getPosts()[0],
        }
    },
    componentDidMount: function() {
        var self = this;
        PostDataStore.on('selected',function() {
            self.setState({
                selected:PostDataStore.getSelected(),
            })
        });
        PostDataStore.on('posts',function() {
            self.setState({
                posts:PostDataStore.getPosts(),
            })
        });
    },
    render: function() {
        return (
            <div id="main-content" className='container-fluid vbox grow'>
                <div className='hbox'>
                    <PostMeta   post={this.state.selected}/>
                    <Toolbar    post={this.state.selected}/>
                </div>
                <div className='hbox grow'>
                    <PostList posts={this.state.posts}/>
                    <PostEditor post={this.state.selected}/>
                    <div id="modeltree" className="scroll">
                        tree goes here
                    </div>
                </div>

        </div>);
    }
});

React.render(<MainView/>, document.getElementById("main"));


PostDataStore.loadPosts();