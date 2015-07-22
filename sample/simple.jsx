var React = require('react');
var moment = require('moment');


function semanticToHtml(node) {
    if(node.type == 'block') {
        return {__html: "<p>"+semanticToHtml_helper(node)+"</p>"};
    }
    if(node.type == 'text') {
        return node.text;
    }
}

function semanticToHtml_helper(node) {
    return node.content.map(function(kid) {
        return semanticToHtml(kid);
    }).join("");
}

var Post = React.createClass({
    render: function() {
        var content = semanticToHtml(this.props.raw);
        var tags = this.props.tags.map(function(tag) {
            return <a key={tag}>{tag}</a>
        });
        var date = moment.unix(this.props.timestamp);
        return <div>
                <p>Posted {date.format("MMMM Do, YYYY")}</p>
                <h3>{this.props.title}</h3>
                <div dangerouslySetInnerHTML={content}></div>
                <div>{tags}</div>
            </div>
    }
});

var Sidebar = React.createClass({
    render: function() {
        return <ul>
            <li><a href='#'>Blog</a></li>
            </ul>
    }
});

var Output = React.createClass({
    render: function() {
        return <div id='content'>
                <Sidebar/>
                <Post {...this.props}/>
            </div>
    }
});

exports.Output = Output;