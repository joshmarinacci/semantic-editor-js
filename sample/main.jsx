var React = require('react');

var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');

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
}
model.setStyles(std_styles);
function setupModel(model) {


    var block1 = model.makeBlock();
    var text1 = model.makeText("This is an empty post. please create a new one.");
    block1.append(text1);
    model.append(block1);
    return model;
}
var model = setupModel(model);

function dataToModel_helper(data,root,model) {
    data.forEach(function(dnode) {
        if(dnode.type == 'text') return root.append(model.makeText(dnode.text));
        if(dnode.type == 'root') return dataToModel_helper(dnode.content,root,model);
        var mnode = null;
        if(dnode.type == 'span') mnode = model.makeSpan();
        if(dnode.type == 'block') mnode = model.makeBlock();
        if(dnode.style) mnode.style = dnode.style;
        dataToModel_helper(dnode.content,mnode,model);
        root.append(mnode);
    });
}

function dataToModel(data) {
    var model = doc.makeModel();
    model.setStyles(std_styles);
    dataToModel_helper(data,model.getRoot(),model);
    return model;
}
function modelToData_helper(node) {
    if(node.type == 'block') {
        return {
            type:'block',
            style:node.style,
            content: node.content.map(modelToData_helper)
        }
    }
    if(node.type == 'text') {
        return {
            type:'text',
            text:node.text
        }
    }
    if(node.type == 'span') {
        return {
            type:'span',
            style:node.style,
            content: node.content.map(modelToData_helper)
        }
    }
    if(node.type == 'root') {
        return node.content.map(modelToData_helper)
    }
}
function modelToData(model) {
    return modelToData_helper(model.getRoot());
}

var posts = [
    {
        id:'id_foo1',
        slug:"testpost1",
        title:"Test Post 1",
        content: [
            {
                type:'block', style:'header', content:[
                {
                    type:'text',
                    text:'a header'
                }
            ]
            },
            {
                type:'block',
                style:'body',
                content: [
                    {
                        type:'text',
                        text:'my cool text'
                    },
                    {
                        type:'span',
                        style:'bold',
                        content:[
                            {
                                type:'text',
                                text:"bold text"
                            }
                        ]
                    },
                    {
                        type:'text',
                        text:"more plain text"
                    }
                ]
            }
        ]
    },
    {
        id:"id_foo2",
        slug:"testpost2",
        title:"Test Post 2",
        content: [
            {
                type:'root',
                content: [
                    {
                        type:'block',
                        style:'body',
                        content: [
                            {
                                type:'text',
                                text:"another post"
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

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
        this.selected = this.posts.find(function(post) { return post.id == id; });
        this.fire('selected');
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
        post.content = content;
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
        return <ul id="post-list">{posts}</ul>
    }
});

var PostMeta = React.createClass({
    getInitialState: function() {
        return {
            slug:"slug value",
            title:"title value"
        }
    },
    componentWillReceiveProps:function(props) {
        var post = PostDataStore.getSelected();
        if(!post) return;
        this.setState({
            slug:post.slug,
            title: post.title
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
        return <div id="post-meta"><form>
            <div>
                <label>slug</label><input type='text' value={this.state.slug} onChange={this.updateSlug} onBlur={this.updateModel}/><br/>
                <label>title</label><input type='text' value={this.state.title} onChange={this.updateTitle} onBlur={this.updateModel}/><br/>
            </div>
        </form></div>
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
    },
    componentWillReceiveProps: function(props) {
        if(typeof props.post == 'undefined') return;
        var editor = React.findDOMNode(this.refs.editor);
        model = dataToModel(props.post.content);
        keystrokes.setModel(model);
        dom.syncDom(editor,model);
    },
    keydown: function(e) {
        keystrokes.handleEvent(e);
    },
    render: function() {
        return <div ref="editor" id="post-editor" className="semantic-view grow" contentEditable={true} spellCheck={false}
                    onKeyDown={this.keydown}
            ></div>
    }
});

var style_lut = {
    block:'p',
    header:'h1',
    'block-code':'pre',
    bold:'b',
    italic:'i'
};
var type_lut = {
    root:'div',
    block:'div',
    span:'span'
};
function tag(name, node) {
    return '<'+name+'>'+childrenToHtml(node)+'</'+name+'>';
}
function childrenToHtml(node) {
    var str = "";
    for(var i=0; i<node.childCount(); i++) {
        str += nodeToHtml(node.child(i));
    }
    return str;
}
function nodeToHtml(node) {
    if(node.type == 'text') return node.text;
    if(node.style && style_lut[node.style]) return tag(style_lut[node.style], node);
    if(node.type && type_lut[node.type]) return tag(type_lut[node.type], node);
    throw Error("shouldn't be here");
}
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
    exportToConsole: function() {
        var model = PostDataStore.getModel();
        console.log("html = ", nodeToHtml(model.getRoot()));
    },
    setModelToPost: function() {
        var data = modelToData(model);
        PostDataStore.updateContent(this.props.post,data);
    },
    render: function() {
        return <div className='grow' id="toolbar">
            <BlockDropdown styles={model.getStyles().block} type="block"/>
            <BlockDropdown styles={model.getStyles().inline} type="inline"/>
            <button onClick={this.setModelToPost}>Save</button>
            <button value="fullscreen">Fullscreen</button>
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
            <div id="main-content" className='container vbox'>
                <div className='hbox'>
                    <PostList posts={this.state.posts}/>
                    <PostEditor post={this.state.selected}/>
                </div>

                <div className='hbox'>
                    <PostMeta   post={this.state.selected}/>
                    <Toolbar    post={this.state.selected}/>
                </div>
        </div>);
    }
});

React.render(<MainView/>, document.getElementById("main"));


PostDataStore.loadPosts();