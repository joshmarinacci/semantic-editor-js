/**
 * Created by josh on 7/20/15.
 */


//list of posts. nothing to save

require('node-jsx').install();
var React = require('react');
var simple = require('./simple.jsx');
var http  = require('http');


var posts = [
    {
        id:'id_foo1',
        slug:"testpost1",
        title:"Test Post 1",
        content: [
            {
                type:"root",
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




var PORT = 39865;
console.log("starting on port", PORT);

function ERROR(res,str) {
    console.log("ERROR",str);
    res.statusCode = 500;
    res.setHeader('Content-Type','text/json');
    res.write(JSON.stringify({status:'error','message':str}));
    res.end();
}
function SUCCESS(res,str) {
    console.log("SUCCESS",str);
    res.statusCode = 200;
    res.setHeader('Content-Type','text/json');
    res.write(JSON.stringify({status:'success','message':str}));
    res.end();
}

function allowAccess(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
}

//if ('OPTIONS' == req.method) return res.send(200);

function renderPage() {
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
    return html;
}

var handlers = {
    '/status': function (req, res) {
        // console.log("handling status");
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/json');
        res.write(JSON.stringify({'status': 'alive'}));
        res.end();
    },
    '/posts': function(req,res) {
        res.statusCode = 200;
        allowAccess(res);
        res.setHeader('Content-Type', 'text/json');
        res.write(JSON.stringify(posts));
        res.end();
    },
    '/samplepost': function(req,res) {
        res.statusCode = 200;
        allowAccess(res);
        res.setHeader('Content-Type','text/html');
        res.write(renderPage());
        res.end();
    }
}


http.createServer(function(req,res) {
    var parts = require('url').parse(req.url);
    console.log("parts = ", parts);
    if(handlers[parts.pathname]) return handlers[parts.pathname](req,res);
    console.log("no handler");
    return ERROR(res,"no handler");
}).listen(PORT, function() {
    console.log("we are up and running");
});
