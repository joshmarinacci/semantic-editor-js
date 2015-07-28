var React = require('react');

var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');
var moment = require('moment');
var PostDataStore = require('./PostDataStore');
var PostEditor = require('./PostEditor.jsx');
var PostMeta = require('./PostMeta.jsx');
var PostList = require('./PostList.jsx');
var utils = require('./utils');


function setupModel() {
    var model = doc.makeModel();
    var block1 = model.makeBlock();
    var text1 = model.makeText("This is an empty post. please create a new one.");
    block1.append(text1);
    model.append(block1);
    PostDataStore.setModel(model);
}
setupModel();

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
        var model = PostDataStore.getModel();
        if(this.props.type == 'block') {
            keystrokes.changeBlockStyle(model.getStyles().block[name]);
        }
        if(this.props.type == 'inline') {
            keystrokes.styleSelection(null,model.getStyles().inline[name]);
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
        root.deleteFromParent();
    }
}
function deleteEmptyBlocks(root) {
    if(root.childCount() > 0) {
        root.content.forEach(deleteEmptyBlocks);
    } else {
        if(root.type == doc.BLOCK) {
            root.deleteFromParent();
        }
    }
}

function convertPlainSpans(root) {
    var model = PostDataStore.getModel();
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
        var model = PostDataStore.getModel();
        console.log("removing the empty blocks",model);
        deleteEmptyBlocks(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    removeEmptyText: function() {
        var model = PostDataStore.getModel();
        deleteEmptyText(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    removePlainSpans: function() {
        var model = PostDataStore.getModel();
        convertPlainSpans(model.getRoot());
        var editor = PostDataStore.getEditor();
        dom.syncDom(editor,model);
        keystrokes.markAsChanged();
        this.setState({open:false})
    },
    mergeAdjacentText: function() {
        var model = PostDataStore.getModel();
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
            var model = PostDataStore.getModel();
            self.setState({
                styles:model.getStyles()
            });
        });
    },
    setModelToPost: function() {
        var model = PostDataStore.getModel();
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