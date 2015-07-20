var React = require('react');

var doc = require('../src/model');
var dom = require('../src/dom');
var keystrokes = require('../src/keystrokes');

function setupModel() {
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
var model = setupModel();

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
        return (<div id="main-content">
            <PostList posts={posts}/>
            <PostEditor post={this.state.selected}/>
            <PostMeta   post={this.state.selected}/>
        </div>);
    }
});

React.render(<MainView/>, document.getElementById("main"));
