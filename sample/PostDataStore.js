/**
 * Created by josh on 7/25/15.
 */
var moment = require('moment');
var utils = require('./utils');
var Model = require('../src/model');
var Editor = require('../src/editor');

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
        return this._real_editor.getModel();
    },
    setModel: function(model) {
        model.setStyles(std_styles);
        this._real_editor.setModel(model);
    },
    selectById:function(id) {
        var self = this;
        utils.getJSON("/load?id="+id,function(post){
            if(typeof post.slug == 'undefined') {
                post.slug = post.name;
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
    updateTags: function(post, tags) {
        if(typeof tags == 'undefined' || tags == null ) {
            tags = "";
        }
        var tags = tags.split(",");
        var ftags = [];
        tags.forEach(function(tag) {
            if(tag.trim().length > 0) ftags.push(tag.trim());
        });
        post.tags = ftags;
        console.log("set final tags to",post.tags);
        this.fire('selected')
    },
    updateStatus: function(post, status) {
        post.status = status;
    },
    updateContent: function(post, content) {
        post.content = null;
        post.raw = content;
        post.format = 'jsem';
        utils.postJSON('/save',post,function(res){
            console.log("saved with result",res);
        });
    },
    deletePost:function(post) {
        var self = this;
        console.log("deleting post",post.title,post.id);
        utils.postJSON("/delete?id="+post.id,{},function(res) {
            console.log("got the result of deleting",res);
            for(var i=0; i<self.posts.length; i++) {
                var oldpost = self.posts[i];
                if(oldpost.id == post.id) {
                    self.posts.splice(i,1);
                    break;
                }
            }
            self.fire('posts');
            self.selectById(self.posts[0].id);
        });
    },
    loadPosts: function() {
        var self = this;
        utils.getJSON('/posts',function(resp){
            self.setPosts(resp);
        });
    },
    makeNewPost: function() {
        var post = {
            title:'no title set',
            slug:'no_slug_set',
            timestamp: moment().unix(),
            format : 'jsem',
            tags : [],
            status:'draft',
            id: 'id_'+Math.floor(Math.random()*100*1000*1000)
        };
        var model = Model.makeModel();
        var blk = model.makeBlock();
        var txt = model.makeText("new post here");
        blk.append(txt);
        model.append(blk);
        var data = model.toJSON();
        this._real_editor.setModel(model);
        this.updateContent(post,data);
        this.posts.unshift(post);
        this.fire('posts');
        this.selectById(post.id);
    },
    _real_editor: Editor.makeEditor(),
    getRealEditor: function() {
        return this._real_editor;
    }
};

module.exports = PostDataStore;