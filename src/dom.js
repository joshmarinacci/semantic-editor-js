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

exports.modelToDom = function(mod,dom, doc) {
    if(mod.getRoot) return exports.modelToDom(mod.getRoot(),dom,doc);
    if(mod.type == Model.ROOT) {
        mod.content.forEach(function(modch){
            dom.appendChild(exports.modelToDom(modch,dom,doc));
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
            block.appendChild(exports.modelToDom(modch,dom,doc));
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
            block.appendChild(exports.modelToDom(modch,dom,doc));
        });
        return block;
    }
}

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

exports.findModelForDom = function(model,domch) {
    if(domch.nodeType == ELEMENT_NODE) {
        return findModelForId(model,domch.id);
    }
    if(domch.nodeType == TEXT_NODE) {
        var parent_mod = exports.findModelForDom(model,domch.parentNode);
        var n = domIndexOf(domch);
        return parent_mod.child(n);
    }
    console.log("UNKNOWN DOM NODE TYPE",domch.nodeType,TEXT_NODE);
};

exports.findDomForModel = function(modch, dom_root) {
    if(!dom_root) throw new Error("dom root is null");
    if(modch == null) throw new Error("model node is null");
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
    var modch = exports.findModelForDom(model,domch);
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

    if(!change.end) {
        console.log("change end is still undefined!!!");
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

function isLastTextNode(node) {
    if(node.type == Model.TEXT) {
        return isLastTextNode(node.getParent());
    }
    if(node.type == Model.SPAN || node.type == Model.BLOCK) {
        if(node.childCount() > 1) return false;
        return isLastTextNode(node.getParent());
    }
    if(node.type == Model.ROOT && node.childCount() == 1) {
        return true;
    }
    return false;
}

exports.applyChanges = function(changes, model) {
    changes.forEach(function(chg) {
        //for text change, just copy string to the model
        if(chg.type == 'text-change') {
            if(chg.mod.type !== Model.TEXT) {
                console.log("trying to do a text change to a non-text node");
                return;
            }
            chg.mod.text = chg.text;
            if(chg.mod.text.length == 0) {
                if(isLastTextNode(chg.mod)) {
                    console.log("refusing to delete the last text node");
                    return;
                }
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
            //don't delete if this is the last text node
            if(chg.mod.type == Model.TEXT && isLastTextNode(chg.mod)) {
                console.log("don't delete because we are the last", chg.mod.id);
                return;
            }
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

exports.print = function(dom,tab) {
    if(!tab) tab = "";
    if(dom.nodeType == ELEMENT_NODE) {
        console.log(tab + dom.nodeName + "#"+dom.id);
        dom.childNodes.forEach(function(domch){
            exports.print(domch,tab+"  ");
        })
    }
    if(dom.nodeType == TEXT_NODE) console.log(tab + dom.nodeType + ' ' + dom.nodeValue);
}

function mergeParentBlocksIfNeeded(nodeA, nodeB) {
    var startBlock = nodeA.findBlockParent();
    var endBlock   = nodeB.findBlockParent();
    if(startBlock.id != endBlock.id)  {
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
    });
    changes.push({
        type:'delete',
        mod:end
    });
    return changes;
}

exports.makeDeleteTextRange = function(range,model) {
    var changes = [];
    if(range.start.mod == range.end.mod) {
        //console.log("in the same mod", range.start.offset, range.end.offset);
        var txt = range.start.mod.text;
        if(txt == null || typeof txt == 'undefined') txt = "";
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
        return changes;
    }
    var it = model.getIterator(range.start.mod);
    var prev;
    while(it.hasNext()) {
        prev = ch;
        ch = it.next();
        if(ch == range.end.mod) {
            var txt = range.end.mod.text;
            if(txt == null || typeof txt == 'undefined') txt = "";
            changes.push({
                type:'text-change',
                mod: range.end.mod,
                text: txt.substring(range.end.offset)
            });
            changes = changes.concat(mergeParentBlocksIfNeeded(range.start.mod,ch));
            break;
        }
        if(ch.type == Model.TEXT) {
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
    } else {
        clearChildren(dom);
        mod.content.forEach(function(modch){
            dom.appendChild(exports.modelToDom(modch,dom_root,doc));
        });
    }
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
    //assume everything is inside the same block
    //make a span
    var span = model.makeSpan();
    span.style = style;

    //split first text
    var txt1 = range.start.mod.text;
    changes.push({
        type:"text-change",
        mod: range.start.mod,
        text: txt1.substring(0,range.start.offset)
    });

    //put second half of first text inside
    //add the span
    changes.push({
        type:'insert-after',
        mod:range.start.mod,
        insert:span
    });
    changes.push({
        type:'append',
        mod:span,
        target: model.makeText(txt1.substring(range.start.offset))
    });

    var it = model.getIterator(range.start.mod);
    var tomove = {};
    while(it.hasNext()) {
        var ch = it.next();
        if(ch == range.end.mod) {
            //console.log("reached the end");
            //console.log('we can move');

            //only move nodes that don't have parents in the list
            //and that aren't the end point
            for(var id in tomove) {
                if(id == range.end.mod.getParent().id) continue;
                var pid = tomove[id].getParent().id;
                if(typeof tomove[pid] !== 'undefined'){
                    //console.log("parent already present. don't move it");
                    continue;
                }
                //console.log('moving', id);
                changes.push({
                    type:'delete',
                    mod:tomove[id]
                });
                changes.push({
                    type:'append',
                    mod:span,
                    target: tomove[id]
                });
            }
            //split the stop point in half, put half inside, leave the rest
            var etxt = range.end.mod.text;
            changes.push({
                type:'append',
                mod:span,
                target: model.makeText(etxt.substring(0,range.end.offset))
            });
            changes.push({
                type:'text-change',
                mod: range.end.mod,
                text: etxt.substring(range.end.offset)
            });
            break;
        }
        tomove[ch.id] = ch;
    }
    return changes;
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

exports.makeClearStyleTextRange = function(range, model, style) {
    var changes = [];
    if(range.start.mod == range.end.mod) {
        //console.log("in the same mod", range.start.offset, range.end.offset);
        var txt = range.start.mod.text;
        //start
        changes.push({
            type:'text-change',
            mod: range.start.mod,
            text: txt.substring(0,range.start.offset)
        });
        //end
        changes.push({
            type:'insert-after',
            mod: range.start.mod,
            insert: model.makeText(txt.substring(range.end.offset))
        });

        var span = model.makeSpan();
        span.style = 'body';
        span.append(model.makeText(txt.substring(range.start.offset,range.end.offset)));
        changes.push({
            type:'insert-after',
            mod: range.start.mod,
            insert: span
        });
        return changes;
    }


    //assume everything is inside the same block
    //make a span
    //split first text
    //before
    var txt1 = range.start.mod.text;
    changes.push({
        type:"text-change",
        mod: range.start.mod,
        text: txt1.substring(0,range.start.offset)
    });

    var prev = range.start.mod;
    var next = model.makeText(txt1.substring(range.start.offset));

    //put second half of first text inside
    //add the span
    changes.push({
        type:'insert-after',
        mod: range.start.mod,
        insert: next
    });
    prev = next;


    var it = model.getIterator(range.start.mod);
    var tomove = {};

    while(it.hasNext()) {
        var ch = it.next();
        if(ch == range.end.mod) {
            //console.log("reached the end");
            //console.log('we can move');
            //only move nodes that don't have parents in the list
            //and that aren't the end point

            for(var id in tomove) {
                if(id == range.end.mod.getParent().id) continue;
                var pid = tomove[id].getParent().id;
                if(typeof tomove[pid] !== 'undefined'){
                    //console.log("parent already present. don't move it");
                    //continue;
                }
                if(tomove[id].type == Model.SPAN) {
                    continue;
                }
                console.log('moving', id, 'after',prev.id);
                changes.push({
                    type:'delete',
                    mod:tomove[id]
                });
                changes.push({
                    type:'insert-after',
                    mod:prev,
                    insert: tomove[id]
                });
                prev = tomove[id];
            }

            //split the stop point in half, put half inside, leave the rest
            var etxt = range.end.mod.text;

            next = model.makeText(etxt.substring(0,range.end.offset));
            changes.push({
                type:'insert-after',
                mod:prev,
                insert: next
            });
            prev = next;
            changes.push({
                type:'text-change',
                mod: range.end.mod,
                text: etxt.substring(range.end.offset)
            });

            break;
        }
        tomove[ch.id] = ch;
    }
    return changes;
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
