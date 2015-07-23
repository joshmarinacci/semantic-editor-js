var doc = require('./model');

/**
 * Created by josh on 7/18/15.
 */

function clearChildren(root) {
    while (root.firstChild) root.removeChild(root.firstChild);
}

function renderTree(root,model) {
    clearChildren(root);
    root.appendChild(renderTreeChild(model.getRoot()));
}

function renderTreeChild(mnode) {
    var ul = document.createElement('ul');
    for(var i=0; i<mnode.childCount(); i++) {
        var li = document.createElement('li');

        var child = mnode.child(i);
        var text = child.type + " " + child.id;
        li.appendChild(document.createTextNode(text));
        if(child.type == doc.TEXT) {
            li.appendChild(document.createTextNode(': "'+child.text+'"'));
        }
        if(child.childCount() > 0) {
            var child_dom = renderTreeChild(child);
            li.appendChild(child_dom);
        }
        ul.appendChild(li);
    }
    return ul;
}

exports.renderTree = renderTree;

exports.setRawHtml = function(editor, html) {
    clearChildren(editor);
    editor.innerHTML = html;
}

function syncDomChildren(mod,dom) {
    mod.content.forEach(function(mod_ch){
        var dom_ch = syncDom(mod_ch);
        if(dom_ch != null) dom.appendChild(dom_ch);
    });
}
function syncDom(mod,edi) {
    if(mod.type == doc.TEXT) {
        return document.createTextNode(mod.text);
    }
    if(mod.type == doc.ROOT) {
        mod.content.forEach(function(mod_ch){
            var dom_ch = syncDom(mod_ch);
            edi.appendChild(dom_ch);
        });
    }
    if(mod.type == doc.SPAN) {
        var dom = document.createElement('span');
        if(mod.meta) {
            if (mod.meta.elementName == 'A' || mod.style == 'link') {
                dom = document.createElement('a');
                if (mod.meta.href) {
                    dom.setAttribute("href", mod.meta.href);
                    dom.setAttribute("class","with-tooltip");
                    dom.innerHTML = "<b class='link-tooltip'>"+mod.meta.href+"</b>";
                }
            }
            if( mod.style == 'image') {
                dom = document.createElement('img');
                dom.setAttribute('src',mod.meta.src);
            }
        }
        dom.id = mod.id;
        dom.classList.add(mod.style);
        syncDomChildren(mod,dom);
        return dom;
    }
    if(mod.type == doc.BLOCK) {
        var dom = document.createElement('div');
        dom.id = mod.id;
        dom.classList.add(mod.style);
        syncDomChildren(mod,dom);
        return dom;
    }
    return null;
}
exports.syncDom = function(editor,model) {
    clearChildren(editor);
    syncDom(model.getRoot(),editor);
};


exports.saveSelection = function (model) {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    var start = findParentNonTextNode(range.startContainer);
    var end = findParentNonTextNode(range.endContainer);
    var ret = {
        collapsed:range.collapsed,
        startpos: {
            id:start.node.id,
            path:start.path,
            offset:range.startOffset,
            model:model,
            dom_node:start.dom_node
        },
        endpos: {
            id: end.node.id,
            path:end.path,
            offset:range.endOffset,
            model:model
        }
    };
    ret.startpos.node = exports.findModelFromPosition(ret.startpos,model);
    ret.endpos.node = exports.findModelFromPosition(ret.endpos,model);

    return ret;
};


function genModelFromDom(node) {
    if(node.nodeType == Element.TEXT_NODE) {
        return {
            id:doc.genId(),
            type:'text',
            content: node.nodeValue
        }
    }
    if(node.nodeType == Element.ELEMENT_NODE) {
        var content = [];
        for(var i=0; i<node.childNodes.length; i++) {
            content.push(genModelFromDom(node.childNodes[i]));
        }
        var style = 'bold';
        var type = 'inline';
        if(Array.prototype.indexOf.call(node.classList,'italic') >= 0) {
            type = 'inline';
            style = 'italic';
        }
        if(Array.prototype.indexOf.call(node.classList,'header') >= 0) {
            style = 'header';
            type = 'block';
        }
        return {
            id:doc.genId(),
            type:type,
            style:style,
            content:content
        }
    }
    console.log("ERROR. UNSUPPORTED NODE TYPE",node.nodeType,node);
}

exports.applyChanges = function(editor,model,changes) {
    changes.forEach(function(ch){
        if(ch.type=='text') {
            ch.model_node.text = ch.new_text;
        }
        if(ch.type == 'append') {
            if(ch.dom_node.nodeType == Element.ELEMENT_NODE) {
                ch.model.push(genModelFromDom(ch.dom_node));
            }
            if(ch.dom_node.nodeType == Element.TEXT_NODE) {
                ch.model.push(genModelFromDom(ch.dom_node));
            }
        }
        if(ch.type == 'remove'){
            ch.model.splice(ch.mod_i,1);
        }
        if(ch.type == 'delete'){
            ch.model.content.splice(ch.mod_i,1);
        }
        if(ch.type == 'insert') {
            var mod = genModelFromDom(ch.dom_node);
            ch.model.splice(ch.mod_i,0,mod);
        }
        if(ch.type == 'transform') {
            if(ch.model_node.type == 'block') {
                if(ch.dom_node.nodeName == 'BR') {
                    var parent = ch.model_node.getParent();
                    var n = parent.content.indexOf(ch.model_node);
                    parent.content.splice(n,1);
                }
            }
        }
    });
}

var u = {
    incount: 0,
    genTab: function() {
        var str = "";
        for(var i=0; i<this.incount; i++) str += "  ";
        return str;
    },
    p: function(s) {
        var args = Array.prototype.slice.call(arguments);
        console.log(this.genTab()+args.join(" "));
    },
    indent: function() {
        this.incount++;
    },
    outdent: function() {
        this.incount--;
    }
};

var dom_table = {
    'p':{
        type:doc.BLOCK,
        style:'body'
    },
    'ul':{
        type:doc.BLOCK,
        style:'unordered-list'
    },
    'li':{
        type:doc.BLOCK,
        style:'list-item'
    },
    'h3':{
        type:doc.BLOCK,
        style:'subheader'
    },
    '#text': {
        type:doc.TEXT,
        style:'none'
    },
    'em': {
        type:doc.SPAN,
        style:'italic'
    },
    'strong': {
        type:doc.SPAN,
        style:'bold'
    },
    'i': {
        type: doc.SPAN,
        style:'italic'
    },
    'a': {
        type:doc.SPAN,
        style:'link'
    },
    '#comment': {
        type:'skip',
        style:'none'
    },
    'img': {
        type:doc.SPAN,
        style:'image'
    }
}
function domToModel(dom,model) {
    var name = dom.nodeName.toLowerCase();
    var def = dom_table[name];
    if(!def) {
        u.p("WARNING: We don't support '" + name + "' yet");
        return null;
    }
    if(def.type == 'skip') {
        u.p("skipping",dom);
        return null;
    }
    if(def.type == doc.BLOCK){
        var out = model.makeBlock();
        for(var i=0; i<dom.childNodes.length; i++) {
            var node = dom.childNodes[i];
            var ch = domToModel(node,model);
            if(ch != null) {
                out.append(ch);
            }
        }
        out.style = def.style;
        return out;
    }
    if(def.type == doc.SPAN) {
        var out = model.makeSpan();
        for(var i=0; i<dom.childNodes.length; i++) {
            var node = dom.childNodes[i];
            var ch = domToModel(node,model);
            if(ch != null) {
                out.append(ch);
            }
        }
        out.style = def.style;
        if(def.style == 'image') {
            out.meta = {
                src: dom.src
            }
        }
        return out;
    }
    if(def.type == doc.TEXT) {
        return model.makeText(dom.nodeValue);
    }
}
exports.domToNewModel = function(dom_root) {
    var model = doc.makeModel();
    for(var i=0; i<dom_root.childNodes.length; i++) {
        var dom_node = dom_root.childNodes[i];
        u.indent();
        var ch = domToModel(dom_node,model);
        if(ch == null) {
            u.p("no child generated. ERROR?");
            continue;
        }
        //move text and span children into a block. can't be top-level
        if(ch.type == doc.TEXT || ch.type == doc.SPAN) {
            var blk = model.makeBlock();
            blk.style = 'body';
            blk.append(ch);
            model.getRoot().append(blk);
        } else {
            model.getRoot().append(ch);
        }
        u.outdent();
    }
    return model;
};

exports.scanForChanges = function(dom_root,mod_root) {
    var changes = [];
    if(dom_root.childNodes.length != mod_root.childCount()) {
        u.p("WARNING: length has changed");
    }

    //do children first
    var dom_i = 0;
    var dom_len = dom_root.childNodes.length;
    var mod_i = 0;
    var mod_len = mod_root.childCount();
    if(mod_len > 0 && dom_len > 0) {
        while(true) {
            var dom_node = dom_root.childNodes[dom_i];
            var mod_node = mod_root.child(mod_i);
            //if next dom matches current node, then a new node was inserted
            //if cur dom matches next model, then a node was deleted
            if(dom_node.nodeType == Node.ELEMENT_NODE) {
                if(dom_node.id != mod_node.id) {
                    if(mod_i+1 < mod_len) {
                        var next_mod = mod_root.child(mod_i+1);
                    }
                    if(dom_i+1 < dom_len) {
                        var next_dom = dom_root.childNodes[dom_i+1];
                        if(next_dom.id == mod_node.id) {
                            //u.p("a new item was inserted");
                        }
                    }
                    if(next_mod && next_dom) {
                        if(next_mod.id == next_dom.id) {
                            changes.push({
                                type:'transform',
                                model_node:mod_node,
                                model_index:mod_i,
                                dom_node:dom_node,
                                dom_index:dom_i
                            })
                        }
                    }
                }
            }
            if(mod_i+1 < mod_len) {
                var next_mod = mod_root.child(mod_i+1);
                if(next_mod.id == dom_node.id) {
                    //u.p("next matchup");
                }
            }
            changes = changes.concat(exports.scanForChanges(dom_node,mod_node));


            mod_i++;
            dom_i++;
            if(mod_i >= mod_len || dom_i >= dom_len ) break;
        }
        if(mod_i < mod_len) {
            changes.push({
                type:'delete',
                model:mod_root,
                mod_i:mod_i
            });
        }
        if(dom_i < dom_len) {
            //u.p("there was an extra dom node. Insertion");
        }
    }
    if(dom_len == 0 && mod_len > 0) {
        //u.p("too many model nodes. must delete them");
        changes.push({
            type:'delete',
            model:mod_root,
            mod_i:0
        })
    }

    //node itself
    if(dom_root.nodeType == Node.TEXT_NODE) {
        if(mod_root.text != dom_root.nodeValue) {
            changes.push({
                type:'text',
                old_text:mod_root.text,
                new_text:dom_root.nodeValue.toString(),
                model_node:mod_root,
                dom_node:dom_root
            });
        }
    }
    u.outdent();
    return changes;
};

exports.findParentBlockDom = function(elem) {
    var parent = elem.parentElement;
    if(parent.tagName == 'DIV') {
        return parent;
    }
    return null;
};


function findParentNonTextNode(dom) {
    var node = dom;
    var path = [];
    while(node.nodeType == Node.TEXT_NODE || node.id == "") {
        var parent = node.parentNode;
        var nn = -1;
        for(var i=0; i<parent.childNodes.length; i++) {
            if(parent.childNodes[i] == node) {
                nn = i;
            }
        }
        path.unshift(nn);
        node = parent;
    }
    return {
        node:node,
        path:path,
        dom_node:dom
    }
}


exports.findModelFromPosition = function(pos,model) {
    var node = model.findNodeById(pos.id);
    if(pos.path) pos.path.forEach(function(index) {
        node = node.child(index);
    });
    return node;
};

exports.textNodeToSelectionPosition = function(node,offset) {
    var parent = node.getParent();
    var n = parent.content.indexOf(node);
    return {
        id:parent.id,
        path:[n],
        offset:offset
    }
};

exports.setSelectionFromPosition = function(pos) {
    if(!pos.id && pos.node != null) {
        pos.id = pos.node;
    }
    if(!pos.id || pos.id == "") {
        console.log("WARNING. bad id");
        return;
    }
    var range = document.createRange();
    var node = document.getElementById(pos.id);
    pos.path.forEach(function(index){
        node = node.childNodes[index];
    });
    range.setStart(node, pos.offset);
    range.collapse(true);
    var wsel = window.getSelection();
    wsel.removeAllRanges();
    wsel.addRange(range);
};


exports.getCaretClientPosition = function() {
    var x = 0, y = 0;
    var sel = window.getSelection();
    if (sel.rangeCount) {
        var range = sel.getRangeAt(0);
        if (range.getClientRects) {
            var rects = range.getClientRects();
            if (rects.length > 0) {
                x = rects[0].left;
                y = rects[0].top;
            }
        }
    }
    return { x: x, y: y };
};
