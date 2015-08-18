var React = require('react');

var Editor = require('../src/editor');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var Keystrokes = require('../src/keystrokes');
var moment = require('moment');
var PostDataStore = require('./PostDataStore');
var PostEditor = require('./PostEditor.jsx');
var utils = require('./utils');

var model = PostDataStore.getModel();

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
            Keystrokes.styleSelection(null, PostDataStore.getRealEditor(), model.getStyles().inline[name]);
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
        self.setState({
            styles:model.getStyles()
        });
    },
    render: function() {
        return <div className='foo' id="toolbar">
            <BlockDropdown styles={this.state.styles.block} type="block"/>
            <BlockDropdown styles={this.state.styles.inline} type="inline"/>
            <button className="btn btn-default" onClick={this.props.doSemantic}>Semantic</button>
            <button className="btn btn-default" onClick={this.props.doVisual}>Visual</button>
            <button className="btn btn-default" onClick={this.props.toggleZen}>Zen</button>
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
        editor.addAction('split-block',function(e,editor) {
            var range = editor.getSelectionRange();
            var oldBlock = range.start.mod.findBlockParent();
            if(!e.shiftKey && oldBlock.style == 'block-code') {
                Keystrokes.stopKeyboardEvent(e);
                var node = range.start.mod;
                var offset  = range.start.offset;
                var txt = node.text.substring(0,offset) + '\n' + node.text.substring(offset);
                var newBlock = Keystrokes.copyWithEdit(oldBlock,node,txt);
                var change = Keystrokes.makeReplaceBlockChange(oldBlock.getParent(),oldBlock.getIndex(),newBlock);
                editor.applyChange(change);
                editor.setCursorAtDocumentOffset(range.documentOffset+1);
                return;
            }
            Keystrokes.splitLine(e,editor);
        });
        editor.addKeyBinding("style-inline-link",'cmd-shift-a');
        editor.addAction("style-inline-link",function(e, editor) {
            console.log('styling an inline link');
            Keystrokes.stopKeyboardEvent(e);
            var sel = window.getSelection();
            var range = sel.getRangeAt(0);
            var model = editor.getModel();
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
                Keystrokes.styleSelection(e,editor,'link');
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
            selected: PostDataStore.getModel(),
            zen:false,
            view:'semantic'
        }
    },
    componentDidMount: function() {
        var editor = PostDataStore.getRealEditor();
        editor.addAction('clear-styles',function(e,editor) {
            var model = editor.getModel();
            Keystrokes.stopKeyboardEvent(e);
            var range = Keystrokes.makeRangeFromSelection(model,window);
            var changes = Dom.makeClearStyleTextRange(range,model);
            Dom.applyChanges(changes,model);
            editor.syncDom();
            editor.markAsChanged();
            var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
            editor.setCursorAtModel(nmod.node, nmod.offset);
        });
        editor.addKeyBinding('clear-styles','cmd-shift-u');


        editor.addAction('insert-poop', function(e,editor) {
            Keystrokes.stopKeyboardEvent(e);
            console.log('inserting poop');
            var range = editor.getSelectionRange();
            var oldBlock = range.start.mod.findBlockParent();
            var node = range.start.mod;
            var offset  = range.start.offset;
            var punycode = require('punycode');
            //from http://www.fileformat.info/info/unicode/char/1F4A9/index.htm
            var char = punycode.ucs2.encode([0x0001F4A9]); // '\uD834\uDF06'
            var txt = node.text.substring(0,offset) + char + node.text.substring(offset);
            var newBlock = Keystrokes.copyWithEdit(oldBlock,node,txt);
            var change = Keystrokes.makeReplaceBlockChange(oldBlock.getParent(),oldBlock.getIndex(),newBlock);
            editor.applyChange(change);
            editor.setCursorAtDocumentOffset(range.documentOffset+1);
        });
        editor.addKeyBinding('insert-poop','cmd-shift-p');
    },
    toggleZen: function() {
        this.setState({
            zen:!this.state.zen
        })
    },
    doSemantic: function() {
        console.log("doing semantic");
        this.setState({
            view:'semantic',
        })
    },
    doVisual: function() {
        console.log("doing visual");
        this.setState({
            view:'visual',
        })
    },
    render: function() {
        var sidebarClasses = "";
        if(this.state.zen == true) {
            sidebarClasses += " hidden";
        }
        return (
            <div>
                <LinkModal/>
                <div id="main-content" className='container-fluid hbox grow'>
                        <div id='sidebar' className={sidebarClasses}>
                            <h3>Semantic Editor demo</h3>
                            <p>this is a demo of <a href='#'>semantic-editor-js</a>
                                that lets you do lots of cool stuff. Just click and start editing.</p>

                        </div>
                        <div className='vbox grow'>
                            <Toolbar    model={model} toggleZen={this.toggleZen} doVisual={this.doVisual} doSemantic={this.doSemantic}/>
                            <PostEditor post={this.state.selected}  zen={this.state.zen} view={this.state.view}/>
                        </div>
                </div>
        </div>);
    }
});

React.render(<MainView/>, document.getElementById("main"));

