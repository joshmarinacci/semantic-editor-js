var React = require('react');

var Editor = require('../src/editor');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var Keystrokes = require('../src/keystrokes');
var moment = require('moment');
var PostDataStore = require('./PostDataStore');
var PostEditor = require('./PostEditor.jsx');
var PostMeta = require('./PostMeta.jsx');
var PostList = require('./PostList.jsx');
var utils = require('./utils');


function setupModel() {
    var model = Editor.makeModel();
    var block1 = model.makeBlock();
    var text1 = model.makeText("This is an empty post. please create a new one.");
    block1.append(text1);
    model.append(block1);
    PostDataStore.setModel(model);
}
setupModel();

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
            Keystrokes.changeBlockStyle(model.getStyles().block[name], PostDataStore.getRealEditor());
        }
        if(this.props.type == 'inline') {
            Keystrokes.styleSelection(null,PostDataStore.getRealEditor(),model.getStyles().inline[name]);
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
    if(root.type == Model.TEXT && root.text.trim().length == 0) {
        root.deleteFromParent();
    }
}

function deleteEmptySpans(root) {
    if(root.childCount() > 0) {
        root.content.forEach(deleteEmptySpans);
    } else {
        if(root.type == Model.SPAN) {
            root.deleteFromParent();
        }
    }
}

function deleteEmptyBlocks(root) {
    if(root.childCount() > 0) {
        root.content.forEach(deleteEmptyBlocks);
    } else {
        if(root.type == Model.BLOCK) {
            root.deleteFromParent();
        }
    }
}

function convertPlainSpans(root) {
    var model = PostDataStore.getModel();
    if(root.type == Model.SPAN && root.style == 'plain') {
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
    if(root.type == Model.TEXT) return;
    if(root.childCount() <= 1) return;

    var child = root.child(0);
    var i=1;
    while(i<root.childCount()) {
        var chnext = root.child(i);
        if(child.type == Model.TEXT && chnext.type == Model.TEXT) {
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
        deleteEmptyBlocks(model.getRoot());
        PostDataStore.getRealEditor().syncDom();
        PostDataStore.getRealEditor().markAsChanged();
        this.setState({open:false})
    },
    removeEmptyText: function() {
        var model = PostDataStore.getModel();
        deleteEmptyText(model.getRoot());
        PostDataStore.getRealEditor().syncDom();
        PostDataStore.getRealEditor().markAsChanged();
        this.setState({open:false})
    },
    removeEmptySpans: function() {
        var model = PostDataStore.getModel();
        deleteEmptySpans(model.getRoot());
        PostDataStore.getRealEditor().syncDom();
        PostDataStore.getRealEditor().markAsChanged();
        this.setState({open:false})
    },
    removePlainSpans: function() {
        var model = PostDataStore.getModel();
        convertPlainSpans(model.getRoot());
        PostDataStore.getRealEditor().syncDom();
        PostDataStore.getRealEditor().markAsChanged();
        this.setState({open:false})
    },
    mergeAdjacentText: function() {
        var model = PostDataStore.getModel();
        mergeAdjacentText(model.getRoot());
        PostDataStore.getRealEditor().syncDom();
        PostDataStore.getRealEditor().markAsChanged();
        this.setState({open:false})
    },
    raiseBlocks: function() {
        var model = PostDataStore.getModel();
        var toRaise = [];
        model.getRoot().content.forEach(function(par) {
            par.content.forEach(function(ch) {
                if(ch.type == Model.BLOCK) {
                    console.log("need to raise it up");
                    toRaise.push(ch);
                }
            });
        });
        console.log("need to raise up", toRaise.length);
        PostDataStore.getRealEditor().syncDom();
        PostDataStore.getRealEditor().markAsChanged();
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
                <li><a href='#' onClick={this.removeEmptySpans}>remove empty spans</a></li>
                <li><a href='#' onClick={this.removeEmptyText}>remove empty text</a></li>
                <li><a href='#' onClick={this.removePlainSpans}>remove plain spans</a></li>
                <li><a href='#' onClick={this.mergeAdjacentText}>merge adjacent text</a></li>
                <li><a href='#' onClick={this.raiseBlocks}>raise blocks</a></li>
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
    toggleZen: function() {
        this.props.onZen();
    },
    render: function() {
        return <div className='grow' id="toolbar">
            <BlockDropdown styles={this.state.styles.block} type="block"/>
            <BlockDropdown styles={this.state.styles.inline} type="inline"/>
            <CleanupDropdown/>
            <button className="btn btn-default" onClick={this.setModelToPost}>Save</button>
            <button className="btn btn-default" onClick={this.doNewPost}>New</button>
            <button className="btn btn-default" onClick={this.doDeletePost}>Delete</button>
            <button className="btn btn-default" onClick={this.toggleZen}>Zen</button>
        </div>
    }
});

var LinkModal = React.createClass({
    getInitialState: function() {
        return {
            targetModel:null,
            linkModalShown: false
        }
    },
    componentDidMount: function() {
        var self = this;
        var editor = PostDataStore.getRealEditor();
        editor.addKeyBinding("style-inline-link",'cmd-shift-a');
        editor.addAction("style-inline-link",function(e) {
            console.log('styling an inline link');
            Keystrokes.stopKeyboardEvent(e);
            var sel = window.getSelection();
            var range = sel.getRangeAt(0);
            var mod = Dom.findModelForDom(model,range.startContainer).getParent();
            if(mod.style == 'link') {
                console.log("inside of an existing link");
                var link = "";
                if(mod.meta && mod.meta.href) {
                    link = mod.meta.href;
                }
                self.setState({
                    targetModel:mod,
                    linkModalShown:true,
                    targetHref:link
                });
                //the input isn't rendered yet, so wait 100ms
                setTimeout(function() {
                    React.findDOMNode(self.refs.urlInput).focus();
                },100);
            } else {
                console.log("doing my own link");
                Keystrokes.styleSelection(e,'link');
            }
        });
    },
    close: function() {
        this.setState({
            linkModalShown: false,
            targetModel: null,
            targetHref: null
        });
    },
    saveLink: function() {
        var mod = this.state.targetModel;
        if(!mod.meta) {
            mod.meta = {}
        }
        mod.meta.href = this.state.targetHref;
        //must propagate this back to the dom
        //var editor = PostDataStore.getEditor();
        //var com_dom = Dom.findDomForModel(mod, editor);
        //Dom.rebuildDomFromModel(mod.getParent(),com_dom.parentElement, editor, editor.ownerDocument);
        PostDataStore.getRealEditor().syncDom();
        this.close();
    },
    updateHref: function() {
        this.setState({
            targetHref: this.refs.urlInput.getDOMNode().value
        });
    },
    checkEscape: function(e) {
        if(e.keyCode == 27) {
            e.preventDefault();
            e.stopPropagation();
            this.close();
        }
    },
    render: function() {
        var linkModalStyle = {
            display: this.state.linkModalShown?'block':'none'
        };
        return <div ref='linkModal' className='modal' style={linkModalStyle}>
            <div className='modal-dialog'>
                <div className='modal-content'>
                    <div className='modal-header'>
                        <h4 className='modal-title'>Link Properties</h4>
                    </div>
                    <div className='modal-body'>
                        <div className="form-group">
                            <label>URL</label>
                            <input type='text'
                                   className='form-control'
                                   onChange={this.updateHref}
                                   value={this.state.targetHref}
                                   ref='urlInput'
                                   onKeyDown={this.checkEscape}
                                />
                        </div>
                    </div>
                    <div className='modal-footer'>
                        <button type="button" className="btn btn-default" onClick={this.close}>Close</button>
                        <button type="button" className="btn btn-primary" onClick={this.saveLink}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    }
})

var MainView = React.createClass({
    getInitialState: function() {
        return {
            posts: PostDataStore.getPosts(),
            selected: PostDataStore.getPosts()[0],
            zen:false
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

        /*
        Keystrokes.key_to_actions["cmd-shift-b"] = "clear-styles";
        Keystrokes.actions_map['clear-styles'] = function(e) {
            var editor = PostDataStore.getEditor();
            var model = PostDataStore.getModel();
            Keystrokes.stopKeyboardEvent(e);
            console.log("clearing the styles");
            var range = Keystrokes.makeRangeFromSelection(model,window);
            console.log("range = ", range.start.mod.id, range.start.offset, range.end.mod.id, range.end.offset);
            var changes = Dom.makeClearStyleTextRange(range,model);

            var com_mod = range.start.mod.getParent().getParent();
            Dom.applyChanges(changes,model);
            Keystrokes.fireEvent('change',{});
            var com_dom = Dom.findDomForModel(com_mod,editor);
            Dom.rebuildDomFromModel(com_mod,com_dom,editor, document);
            var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
            Dom.setCursorAtModel(nmod.node, nmod.offset, editor);
        };
        */



    },
    toggleZen: function() {
        this.setState({
            zen:!this.state.zen
        })
    },
    render: function() {
        return (
            <div>
                <LinkModal/>
                <div id="main-content" className='container-fluid vbox grow'>
                    <div className='hbox'>
                        <PostMeta   post={this.state.selected}  zen={this.state.zen}/>
                        <Toolbar    post={this.state.selected} onZen={this.toggleZen}/>
                    </div>
                    <div className='hbox grow'>
                        <PostList posts={this.state.posts} zen={this.state.zen}/>
                        <PostEditor post={this.state.selected}  zen={this.state.zen}/>
                        <div id="modeltree" className="scroll" style={{display:this.state.zen?"none":"block"}}>
                            tree goes here
                        </div>
                    </div>
                </div>
        </div>);
    }
});

React.render(<MainView/>, document.getElementById("main"));


PostDataStore.loadPosts();