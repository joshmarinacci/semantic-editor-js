var React = require('react');

var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');
var moment = require('moment');

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

var utils = {
    getJSON: function(url,cb) {
        var url = "http://localhost:39865"+url;
        console.log("loading posts from",url);
        var xml = new XMLHttpRequest();
        var self = this;
        xml.onreadystatechange = function(e) {
            if(this.readyState == 4 && this.status == 200) {
                cb(xml.response);
            }
        };
        xml.responseType = 'json';
        xml.open("GET",url);
        xml.send();
    }
};

var PostDataStore = {
    selected:null,
    posts: [],
    listeners:{},
    setPosts: function(posts) {
        this.posts = posts;
        this.fire('posts');
    },
    getPosts: function() {
        return this.posts;
    },
    getModel: function() {
        return model;
    },
    selectById:function(id) {
        var self = this;
        utils.getJSON("/load?id="+id,function(post){
            if(typeof post.slug == 'undefined') {
                post.slug = post.name;
                console.log("FIXED broken slug to",post.slug);
                if(!post.slug) {
                    console.log("SLUG still broken");
                }
            }
            self.selected = post;

            self.fire('selected');
        });
    },
    getSelected: function() {
        return this.selected
    },
    on:function(type, callback) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(callback);
    },
    fire: function(type) {
        this.listeners[type].forEach(function(l){
            l();
        });
    },
    updateSlug: function(post, slug) {
        post.slug = slug;
    },
    updateTitle: function(post, title) {
        post.title = title;
    },
    updateContent: function(post, content) {
        var url = "http://localhost:39865/save";
        post.raw = content;
        post.format = 'jsem';
        console.log("POSTING to ",url);
        var xml = new XMLHttpRequest();
        xml.onreadystatechange = function(e) {
            if(this.readyState == 4 && this.status == 200) {
                console.log("request succeeded",xml.response);
            }
        };
        xml.responseType = 'json';
        xml.open("POST",url,true);
        xml.send(JSON.stringify(post));
    },

    loadPosts: function() {
        var url = "http://localhost:39865/posts";
        console.log("loading posts from",url);
        var xml = new XMLHttpRequest();
        var self = this;
        xml.onreadystatechange = function(e) {
            if(this.readyState == 4 && this.status == 200) {
                self.setPosts(xml.response);
            }
        };
        xml.responseType = 'json';
        xml.open("GET",url);
        xml.send();
    },

    makeNewPost: function() {
        var post = {
            title:'no title set',
            slug:'no_slug_set',
            timestamp: moment().unix(),
            format : 'jsem',
            tags : []
        };
        model = doc.makeModel();
        var blk = model.makeBlock();
        var txt = model.makeText("new post here");
        blk.append(txt);
        model.append(blk);
        var data = model.toJSON();
        this.updateContent(post,data);
        this.selected = post;
        this.fire('selected');
    },

    setEditor: function(ed) {
        this.editor = ed;
    },

    getEditor: function() {
        return this.editor;
    }
};

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

var PostMeta = React.createClass({
    getInitialState: function() {
        return {
            slug:"slug value",
            title:"title value",
            timestamp:0,
        }
    },
    componentWillReceiveProps:function(props) {
        var post = PostDataStore.getSelected();
        if(!post) return;
        this.setState({
            slug:post.slug,
            title: post.title,
            timestamp:post.timestamp
        });
    },
    updateSlug: function(e) {
        this.setState({
            slug: e.target.value
        });
    },
    updateTitle: function(e) {
        this.setState({
            title: e.target.value
        })
    },
    updateModel: function(e) {
        var post = PostDataStore.getSelected();
        if(!post) return;
        PostDataStore.updateSlug(post,e.target.value);
        PostDataStore.updateTitle(post,e.target.value);
    },
    render: function() {
        console.log("this props",this.props);
        if(!this.props.post|| !this.props.post.format) {
            var format = "unknown";
        } else {
            var format = this.props.post.format;
        }
        if(!this.props.post || !this.props.post.timestamp) {
            var timestamp = "unknown";
        } else {
            var timestamp = moment
                .unix(this.props.post.timestamp)
                .format("YYYY MMM DD - hh:mm A");
        }

        return <div id="post-meta">
            <form className='form-horizontal'>
                <div className='form-group'>
                    <label className='col-sm-3 control-label'>slug</label>
                    <div className="col-sm-9">
                        <input className='form-control' type='text' value={this.state.slug} onChange={this.updateSlug} onBlur={this.updateModel}/>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-3 control-label'>title</label>
                    <div className="col-sm-9">
                        <input className='form-control' type='text' value={this.state.title} onChange={this.updateTitle} onBlur={this.updateModel}/><br/>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-3 control-label'>timestamp</label>
                    <div className="col-sm-9">
                        <label className='col-sm-9 control-label'>{timestamp}</label>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-3 control-label'>format</label>
                    <label className='col-sm-9 control-label'>{format}</label>
                </div>
            </form>
        </div>
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
            console.log("converting data to model.",props.post);
            if(props.post.format == 'jsem') {
                console.log("yay! right format");
                model = doc.fromJSON(props.post.raw);
                console.log("the new model is",model);
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

function toClass(def, cond) {
    var str = def.join(" ");
    for(var name in cond) {
        if(cond[name] === true) {
            str += " " + name
        }
    }
    return str;
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
        if(this.props.type == 'block') {
            keystrokes.changeBlockStyle(model.getStyles().block[name]);
        }
        if(this.props.type == 'inline') {
            keystrokes.styleSelectionInline(model.getStyles().inline[name]);
        }
        this.setState({open:false})
    },
    render: function() {
        var openClass = toClass(["btn-group"],{ open:this.state.open });
        var buttonClass = toClass(["btn","btn-default","dropdown-toggle"]);
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
    setModelToPost: function() {
        var data = model.toJSON();
        PostDataStore.updateContent(this.props.post,data);
    },
    doNewPost: function() {
        PostDataStore.makeNewPost();
    },
    render: function() {
        return <div className='grow' id="toolbar">
            <BlockDropdown styles={model.getStyles().block} type="block"/>
            <BlockDropdown styles={model.getStyles().inline} type="inline"/>
            <button className="btn btn-default" onClick={this.setModelToPost}>Save</button>
            <button className="btn btn-default" onClick={this.doNewPost}>New</button>
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