var doc = require('./model');
var Model = doc;

if(typeof document === 'undefined') {
    var TEXT_NODE = 'TEXT_NODE';
    var ELEMENT_NODE = 'ELEMENT_NODE';
} else {
    var TEXT_NODE = document.TEXT_NODE;
    var ELEMENT_NODE = document.ELEMENT_NODE;
}


exports.Node = {
    ELEMENT_NODE: ELEMENT_NODE,
    TEXT_NODE: TEXT_NODE
};
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
        var text = child.type + " " + child.id + " " + child.style;
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
};

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
                    //dom.innerHTML = "<b class='link-tooltip' domtype='skip'>"+mod.meta.href+"</b>";
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
    if(node.nodeType == TEXT_NODE) {
        return {
            id:doc.genId(),
            type:'text',
            content: node.nodeValue
        }
    }
    if(node.nodeType == Node.ELEMENT_NODE) {
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
    while(node.nodeType == TEXT_NODE || node.id == "") {
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
    return {
        id:parent.id,
        path:[node.getIndex()],
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
    console.log("target node is", node);
    if(node.nodeType !== TEXT_NODE) {
        console.log('we have a problem. not at a text node. go down more.', node.childNodes.length);
        for(var i=0; i<node.childNodes.length; i++) {
            var ch = node.childNodes[i];
            console.log("child = ",ch);
            if(ch.nodeType == TEXT_NODE) {
                console.log("found a text child");
            }
        }
    }
    console.log("target offset is",pos.offset);

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


function modelToDom(mod,dom, doc) {
    if(mod.getRoot) return modelToDom(mod.getRoot(),dom,doc);
    if(mod.type == Model.ROOT) {
        mod.content.forEach(function(modch){
            dom.appendChild(modelToDom(modch,dom,doc));
        });
        return dom;
    }
    if(mod.type == Model.TEXT) {
        return doc.createTextNode(mod.text);
    }
    if(mod.type == Model.BLOCK) {
        var block = doc.createElement('div');
        block.id = mod.id;
        block.classList.add(mod.style);
        mod.content.forEach(function(modch){
            block.appendChild(modelToDom(modch,dom,doc));
        });
        return block;
    }
    if(mod.type == Model.SPAN) {
        var block = doc.createElement('span');
        if( mod.style == 'image') {
            block = document.createElement('img');
            block.setAttribute('src',mod.meta.src);
        }

        block.id = mod.id;
        block.classList.add(mod.style);
        mod.content.map(function(modch){
            block.appendChild(modelToDom(modch,dom,doc));
        });
        return block;
    }
}

exports.modelToDom = modelToDom;


function domIndexOf(dom_child) {
    return Array.prototype.indexOf.call(dom_child.parentNode.childNodes,dom_child);
}

function findModelForId(model,id) {
    if(model.id == id) return model;
    if(model.getRoot) return findModelForId(model.getRoot(),id);
    if(model.type != Model.TEXT) {
        for(var i=0; i<model.content.length; i++) {
            var found = findModelForId(model.content[i],id);
            if(found != null) return found;
        }
    }
    return null;
}

function findModelForDom(model,domch) {
    if(domch.nodeType == ELEMENT_NODE) {
        return findModelForId(model,domch.id);
    }
    if(domch.nodeType == TEXT_NODE) {
        var parent_mod = findModelForDom(model,domch.parentNode);
        var n = domIndexOf(domch);
        return parent_mod.child(n);
    }
    console.log("UNKNOWN DOM NODE TYPE",domch.nodeType,TEXT_NODE);
}

exports.findModelForDom = findModelForDom;

exports.findDomForModel = function(modch, dom_root) {
    if(modch.type == Model.BLOCK || modch.type == Model.SPAN) {
        return dom_root.ownerDocument.getElementById(modch.id);
    }
    if(modch.type == Model.TEXT) {
        var mod_par = modch.getParent();
        var dom_par = dom_root.ownerDocument.getElementById(mod_par.id);
        return dom_par.childNodes[modch.getIndex()];
    }
    if(modch.type == Model.ROOT) return dom_root;
    console.log("can't handle model node type", modch.type);
};

function isText(node) {
    if(node.type && node.type == Model.TEXT) return true;
    if(node.nodeType && node.nodeType == TEXT_NODE) return true;
    return false;
}

function calculateChangeRange(model,dom,sel) {
    var change = {};
    //is there a previous sibling?
    var domch = sel.start_node;
    var modch = findModelForDom(model,domch);
    if(modch == null) {
        throw new Error("cannot find model for dom", domch);
    }
    var n = domIndexOf(domch);
    if(n == 0) {
        if(isText(domch) && !isText(modch)) {
            if(sameParentId(modch,domch)) {
                change.start = {
                    dom: domch,
                    mod: modch,
                }
            }
        }
        if(modch.type == Model.TEXT && domch.nodeType == TEXT_NODE) {
            if(modch.text == domch.nodeValue) {
            } else {
                change.start = {
                    dom: domch,
                    mod: modch
                }
            }
        }
    } else {
        var prev_dom = prevDom(domch);
        var prev_mod = prevMod(modch);
        if(prev_mod.id == prev_dom.id && sameParentId(prev_mod,prev_dom)) {
            change.start = {
                dom: domch,
                mod: modch
            }
        }
    }


    //check the next sibling
    if(domch.parentNode.childNodes.length > n+1) {
        var sib = domch.parentNode.childNodes[n+1];
        //if dom_sib == modch then this is an insertion
        if(sib.id == modch.id) {
            change.end = {
                dom: sib,
                mod: modch
            }
        }
    } else {
        change.end = {
            dom: domch,
            mod: modch
        }
    }

    return change;

}

exports.calculateChangeRange = calculateChangeRange;

function sameParentId(mod,dom) {
    if(mod.getParent().id == dom.parentNode.id) return true;
    return false;
}
function nextDom(dom) {
    var n = domIndexOf(dom);
    if(dom.parentNode.childNodes.length > n+1) {
        return dom.parentNode.childNodes[n+1];
    }
    return null;
}
function prevDom(dom) {
    var n = domIndexOf(dom);
    if(n > 0) {
        return dom.parentNode.childNodes[n-1];
    }
    return null;
}
function prevMod(mod) {
    var n = mod.getIndex();
    if(n > 0) {
        return mod.getParent().child(n-1);
    }
    return null;
}


function calculateChangeList(range) {
    var dom = range.start.dom;
    var mod = range.start.mod;
    var changes = [];
    if(isText(dom) && isText(mod)) {
        if(dom.nodeValue == mod.text) {
        } else {
            if(sameParentId(mod,dom)) {
                changes.push({
                    type:'text-change',
                    mod:mod,
                    text:dom.nodeValue
                });
            }
        }
    }
    if(isText(dom) && !isText(mod)) {
        var dom_sib = nextDom(dom);
        if(dom_sib && dom_sib.id == mod.id) {
            changes.push({
                type:'insert-text-before',
                mod:mod,
                dom:dom
            })
        }
    }
    return changes;
}

exports.calculateChangeList = calculateChangeList;


function applyChanges(changes, model) {
    changes.forEach(function(chg) {
        //for text change, just copy string to the model
        if(chg.type == 'text-change') {
            chg.mod.text = chg.text;
            if(chg.mod.text.length == 0) {
                var parent = chg.mod.deleteFromParent();
                if(parent.isEmpty()) {
                    parent.deleteFromParent();
                }
            }
            return;
        }
        if(chg.type == 'insert-text-before') {
            var txt = chg.dom.nodeValue;
            var txtn = model.makeText(txt);
            var par = chg.mod.getParent();
            var n = chg.mod.getIndex();
            par.content.splice(n,0,txtn);
            return;
        }
        if(chg.type == 'delete') {
            var parent = chg.mod.deleteFromParent();
            if(parent.isEmpty()) {
                parent.deleteFromParent();
            }
            return;
        }
        if(chg.type == 'insert-after') {
            var par = chg.mod.getParent();
            var n = chg.mod.getIndex();
            var nn = chg.insert;
            par.content.splice(n+1,0,nn);
            nn.parent = par;
            return;
        }
        if(chg.type == 'append') {
            var par = chg.mod;
            par.append(chg.target);
            return;
        }
        if(chg.type == 'split') {
            model.splitBlockAt(chg.mod,chg.offset);
            return;
        }
        console.log("don't know how to handle change type",chg.type);
    });
}
exports.applyChanges = applyChanges;

function getParentPath(mod) {
    if(mod == null) return;
    return [mod].concat(getParentPath(mod.getParent()));
}

exports.findCommonParent = function(a,b) {
    var p1 = getParentPath(a);
    var p2 = getParentPath(b);
    var found = null;
    for(var i=0; i<p2.length; i++) {
        var pp = p2[i];
        if(p1.indexOf(pp)>=0) {
            found = pp;
            break;
        }
    }
    return found;
};


function print(dom,tab) {
    if(!tab) tab = "";
    if(dom.nodeType == ELEMENT_NODE) {
        console.log(tab + dom.nodeName + "#"+dom.id);
        dom.childNodes.forEach(function(domch){
            print(domch,tab+"  ");
        })
    }
    if(dom.nodeType == TEXT_NODE) {
        console.log(tab + dom.nodeType + ' ' + dom.nodeValue);
    }
}

exports.print = print;



function mergeParentBlocksIfNeeded(nodeA, nodeB) {
    var startBlock = nodeA.findBlockParent();
    var endBlock   = nodeB.findBlockParent();
    if(startBlock.id != endBlock.id)  {
        console.log('we need to merge parent blocks');
        return mergeBlocksBackwards(startBlock,endBlock);
    }
    return [];
}

function mergeBlocksBackwards(start,end) {
    var changes = [];
    end.content.forEach(function(node) {
        changes.push({
            type:'append',
            mod:start,
            target:node
        });
        //start.append(node);
    });
    changes.push({
        type:'delete',
        mod:end
    })
    return changes;
//    end.deleteFromParent();
}

exports.makeDeleteTextRange = function(range,model) {
    var changes = [];
    console.log("deleting from",range.start.mod.id, range.end.mod.id);
    if(range.start.mod == range.end.mod) {
        //console.log("in the same mod", range.start.offset, range.end.offset);
        var txt = range.start.mod.text;
        changes.push({
            type:'text-change',
            mod: range.start.mod,
            text: txt.substring(0,range.start.offset)
            + txt.substring(range.end.offset)
        });
        return changes;
    }
    changes.push({
        type:'text-change',
        mod: range.start.mod,
        text: range.start.mod.text.substring(0,range.start.offset)
    });

    var ch = range.start.mod;
    if(ch == range.end.mod) {
        //console.log("start and end in the same node");
        return changes;
    }
    var it = model.getIterator(range.start.mod);
    var prev;
    while(it.hasNext()) {
        prev = ch;
        ch = it.next();
        if(ch == range.end.mod) {
            //console.log("changing and done");
            changes.push({
                type:'text-change',
                mod: range.end.mod,
                text: range.end.mod.text.substring(range.end.offset)
            });
            changes = changes.concat(mergeParentBlocksIfNeeded(range.start.mod,ch));
            break;
        }
        if(ch.type == Model.TEXT) {
            //console.log('deleting');
            changes.push({
                type:'delete',
                mod: ch
            });
            continue;
        }
        if(ch.type == Model.BLOCK && ch != prev.getParent()) {
            console.log("entered a new block. need to collapse into the previous");
        }
    }
    return changes;
};


exports.rebuildDomFromModel = function(mod,dom, dom_root,doc) {
    if(mod.type == Model.TEXT) {
        dom.nodeValue = mod.text;
        return;
    }
    if(mod.type == Model.BLOCK) {
        clearChildren(dom);
        mod.content.forEach(function(modch){
            dom.appendChild(modelToDom(modch,dom_root,doc));
        });
    }
    if(mod.type == Model.ROOT) {
        clearChildren(dom);
        mod.content.forEach(function(modch){
            dom.appendChild(modelToDom(modch,dom_root,doc));
        });
    }

    console.log("cant handle ",mod.type);
};


exports.makeStyleTextRange = function(range, model, style) {
    var changes = [];
    if(range.start.mod == range.end.mod) {
        //console.log("in the same mod", range.start.offset, range.end.offset);
        var txt = range.start.mod.text;
        changes.push({
            type:'text-change',
            mod: range.start.mod,
            text: txt.substring(0,range.start.offset)
        });
        changes.push({
            type:'insert-after',
            mod: range.start.mod,
            insert: model.makeText(txt.substring(range.end.offset))
        });
        var span = model.makeSpan();
        span.style = style;
        span.append(model.makeText(txt.substring(range.start.offset,range.end.offset)));
        changes.push({
            type:'insert-after',
            mod: range.start.mod,
            insert: span
        });
        return changes;
    }

};

exports.makeSplitChange = function(range,model) {
    var changes = [];
    changes.push({
        type:'split',
        mod:range.start.mod,
        offset:range.start.offset
    });
    return changes;
};
