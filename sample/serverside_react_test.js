/**
 * Created by josh on 7/21/15.
 */

require('node-jsx').install();
var React = require('react');
var simple = require('./simple.jsx');
var props = {
    title:'my first post',
    id:'id_unique_id',
    timestamp:1436133303,
    tags:['tag1','tag2','tag3'],
    raw: { type:'block', content: [ { type:'text', text:"a blog post"}]},
    format:'semantic'
};
var html = React.renderToStaticMarkup(React.createElement(simple.Output,props));
console.log("html = ", html);
