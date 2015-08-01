var React = require('react');
var PostDataStore = require('./PostDataStore');
var moment = require('moment');

var PostItem = React.createClass({
    selectPost: function(e) {
        PostDataStore.selectById(this.props.post.id);
    },
    render: function() {
        return <li><a href='#' onClick={this.selectPost}
            >{this.props.post.title}</a>
            <br/>
            <b>{moment.unix(this.props.post.timestamp).format("YYYY-MM-DD")} </b>
            <i> {this.props.post.format}</i>
        </li>
    }
});

var PostList = React.createClass({
    render: function() {
        var self = this;
        var posts = this.props.posts.map(function(post){
            return <PostItem key={post.id} post={post}/>
        });
        return (
            <ul className='scroll'
                   id="post-list"
                   style={{display:this.props.zen?'none':'block'}}
            >{posts}</ul>
        )
    }
});

module.exports = PostList;