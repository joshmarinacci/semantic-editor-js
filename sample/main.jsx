var React = require('react');

var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');

var model = doc.makeModel();
model.setStyles({
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
});
function setupModel(model) {


    var block1 = model.makeBlock();
    model.setBlockStyle(block1,'header');
    var text1 = model.makeText("This is a header");
    block1.append(text1);
    var text2 = model.makeText(" with some");
    block1.append(text2);
    var text3 = model.makeText(" text");
    block1.append(text3);
    model.getRoot().append(block1);

    var block2 = model.makeBlock();
    model.getRoot().append(block2);
    model.setBlockStyle(block2,'body');
    block2.append(model.makeText("This is a paragraph of body text"));


    var span1 = model.makeSpan();
    span1.style = 'bold';
    span1.append(model.makeText(" with some bold"));
    block2.append(span1);

    var span2 = model.makeSpan();
    span2.style = 'italic';
    span2.append(model.makeText(" and italic"));
    block2.append(span2);

    block2.append(model.makeText(" text to read."));
    block2.append(model.makeText(" And now some more text that we will read and read and it just goes on and on."));

    var block3 = model.makeBlock();
    model.getRoot().append(block3);
    model.setBlockStyle(block3,'body');
    block3.append(model.makeText("This is another paragraph of body text"));

    var block3 = model.makeBlock();
    model.getRoot().append(block3);
    model.setBlockStyle(block3,'block-code');
    block3.append(model.makeText("//codeblock\nfor(var i=0; i<8; i++) {\n  console.log(i);\n}"));
    return model;
}
var model = setupModel(model);

var posts = [
    {
        id:'id_foo1',
        slug:"testpost1",
        title:"Test Post 1",
        content: [
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
    posts: posts,
    listeners:{},
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
        console.log("Firing");
        this.listeners[type].forEach(function(l){
            console.log("f");
            l();
        });
    },
    updateSlug: function(post, slug) {
        post.slug = slug;
    },
    updateTitle: function(post, title) {
        post.title = title;
    }
};

var PostItem = React.createClass({
    selectPost: function(e) {
        console.log("selecting the post",this.props.post.id);
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
        var editor = document.getElementById('post-editor');
        keystrokes.setEditor(editor);
        keystrokes.setModel(model);
        dom.syncDom(editor,model);
        document.getElementById("post-editor").addEventListener("input", keystrokes.handleBrowserInputEvent, false);
    },
    keydown: function(e) {
        keystrokes.handleEvent(e);
    },
    render: function() {
        return <div id="post-editor" className="semantic-view" contentEditable={true} spellCheck={false}
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
    render: function() {
        return <div>
            <BlockDropdown styles={model.getStyles().block} type="block"/>
            <BlockDropdown styles={model.getStyles().inline} type="inline"/>
            <button onClick={this.exportToConsole}>Save</button>
            <button value="fullscreen">Fullscreen</button>
            </div>
    }
});

var MainView = React.createClass({
    getInitialState: function() {
        return {
            posts: PostDataStore.posts,
            selected: PostDataStore.posts[0],
        }
    },
    componentDidMount: function() {
        var self = this;
        PostDataStore.on('selected',function() {
            console.log("selected changed");
            self.setState({
                selected:PostDataStore.getSelected(),
            })
        });
    },
    render: function() {
        return (<div id="main-content" className='container'>
            <PostList posts={posts}/>
            <Toolbar/>
            <PostEditor post={this.state.selected}/>
            <PostMeta   post={this.state.selected}/>
        </div>);
    }
});

React.render(<MainView/>, document.getElementById("main"));
