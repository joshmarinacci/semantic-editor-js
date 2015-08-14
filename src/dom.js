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

exports.setRawHtml = function(dom_root, html) {
    clearChildren(dom_root);
    dom_root.innerHTML = html;
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

function findMatchingMappingRule(type,style,mapping) {
    var rule = mapping[style];
    if(rule && rule.type == type) {
        return rule;
    }
    return null;
}

exports.modelToDom = function(mod,dom, document, mapping) {
    if(mod.getRoot) return exports.modelToDom(mod.getRoot(),dom,document, mapping);
    if(mod.type == Model.ROOT) {
        mod.content.forEach(function(modch){
            dom.appendChild(exports.modelToDom(modch,dom,document, mapping));
        });
        return dom;
    }
    if(mod.type == Model.TEXT) return document.createTextNode(mod.text);
    var rule = findMatchingMappingRule(mod.type,mod.style,mapping);
    if(rule == null && mod.type == Model.SPAN) {
        rule = mapping.default_span;
    }
    if(rule !== null) {
        if(!rule.element) { console.log("MISSING RULE.ELEMENT");}
        var elem = document.createElement(rule.element);
        elem.id = mod.id;
        elem.classList.add(mod.style);
        mod.content.forEach(function(modch){
            elem.appendChild(exports.modelToDom(modch,dom,document, mapping));
        });
        //console.log("the mod is",mod);
        if(rule.isImage === true && mod.meta && mod.meta.src)  elem.setAttribute('src', mod.meta.src);
        if(rule.isLink  === true && mod.meta && mod.meta.href) elem.setAttribute('href',mod.meta.href);
        return elem;
    }
    console.log("didn't match a rule!", mod.type, mod.style);
};

function domIndexOf(dom_child) {
    return Array.prototype.indexOf.call(dom_child.parentNode.childNodes,dom_child);
}


exports.findModelForDom = function(model,domch) {
    if(domch.nodeType == ELEMENT_NODE) {
        return model.findNodeById(domch.id);
    }
    if(domch.nodeType == TEXT_NODE) {
        var parent_mod = exports.findModelForDom(model,domch.parentNode);
        if(parent_mod == null) return null;
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

function findDomBlockParent(dom) {
    if(dom.nodeType == ELEMENT_NODE){
        if(dom.nodeName.toLowerCase() == 'div') {
            return dom;
        }
    }
    return findDomBlockParent(dom.parentNode);
}

function handleBlockPaste(dom,model) {
    var dblock = findDomBlockParent(dom);
    if(!dblock.id) {
        throw new Error("no id still for the dom. this is a problem");
    }
    var mblock = exports.findModelForDom(model,dblock);
    return {
        start : {
            dom:dblock,
            mod:mblock
        },
        end: {
            dom:dblock,
            mod:mblock
        }
    };
}

exports.calculateChangeRange = function(model,dom_root,sel) {
    var change = {};
    //is there a previous sibling?
    var domch = sel.dom;
    var modch = sel.mod;
    if(modch == null) {
        return handleBlockPaste(sel.dom,model);
    }
    if(modch == null) {
        throw new Error("cannot find model for dom", dom_root);
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
        if(isText(modch) && isText(domch)) {
            if(modch.text != domch.nodeValue) {
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

    if(!change.start) {
        console.log('change start is still undefined');
        change.start = {
            dom:domch,
            mod:modch
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

function sameParentId(mod,dom) {
    if(mod.getParent().id == dom.parentNode.id) return true;
    return false;
}
function nextDom(dom) {
    var n = domIndexOf(dom);
    if(dom.parentNode.childNodes.length > n+1) {
        return dom.parentNode.childNodes[n+1];
    } else {
        return nextDom(dom.parentNode);
    }
}
function prevDom(dom) {
    var n = domIndexOf(dom);
    if(n == 0) {
        return prevDom(dom.parentNode);
    }
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
            chg.results = model.splitBlockAt(chg.mod,chg.offset);
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
        console.log(tab + dom.nodeName + "#"+dom.id + " " + dom.classList);
        for(var i=0; i< dom.childNodes.length; i++) {
            exports.print(dom.childNodes[i],tab+"  ");
        }
    }
    if(dom.nodeType == TEXT_NODE) console.log(tab + 'TEXT:' + '"' + dom.nodeValue+'"');
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

exports.syncDom = function(dom_root,model, mapping) {
    exports.rebuildDomFromModel(model.getRoot(), dom_root, dom_root, dom_root.ownerDocument, mapping);
};

exports.rebuildDomFromModel = function(mod, dom, dom_root, doc, mapping) {
    if(typeof doc == 'undefined') {
        console.log(new Error().stack);
        throw new Error("undefined doc");
    }
    if(mod.type == Model.TEXT) {
        dom.nodeValue = mod.text;
    } else {
        clearChildren(dom);
        mod.content.forEach(function(modch){
            dom.appendChild(exports.modelToDom(modch,dom_root,doc,mapping));
        });
        dom.id = mod.id;
    }
};

exports.rebuildModelFromDom = function(dom, model, mapping) {
    return genModelFromDom(dom,model,mapping);
};

function genModelFromDom(node,model, mapping) {
    if(node.nodeType == TEXT_NODE) return model.makeText(node.nodeValue);
    if(node.nodeType == ELEMENT_NODE) {
        var name = node.nodeName.toLowerCase() + '.'+node.className;
        if(mapping[name]) return genModelFromMapping(mapping[name],name,node,mapping, model);
        var name = node.nodeName.toLowerCase();
        if(mapping[name]) return genModelFromMapping(mapping[name],name,node,mapping, model);
    }
    throw new Error("cant convert dom node " + node.nodeType + " " + node.nodeName);
}

function genModelFromMapping(mp, name, node, mappings, model) {
    var nd = null;
    if(mp.skip === true) return null;
    if(mp.type == 'span')   nd = model.makeSpan();
    if(mp.type == 'block')  nd = model.makeBlock();
    if(nd == null) {
        throw new Error("cant convert dom node" + node.nodeName);
    }
    nd.style = mp.style;
    if(mp.isLink === true) nd.meta = { href: node.getAttribute("href") };
    for(var i=0; i<node.childNodes.length; i++) {
        nd.append(genModelFromDom(node.childNodes[i],model, mappings));
    }
    return nd;
}

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
        offset:range.start.offset,
        undo: function() {
            //console.log('we must merge backwards', this.results);
            console.log("merging", this.results[0].id, this.results[1].id);
            var chngs = mergeParentBlocksIfNeeded(this.results[0],this.results[1]);
            //console.log("new changes is",chngs);
            exports.applyChanges(chngs,model);
        }
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


exports.findDomParentWithId = function(con) {
    if(!con) return null;
    if(con.id) return con;
    return exports.findDomParentWithId(con.parentNode);
};

exports.domToDocumentOffset = function(node, target) {
    if (node == target) return {found: true, offset: 0};
    if (node.nodeType == TEXT_NODE) {
        return { found: false, offset: node.nodeValue.length };
    } else {
        var total = 0;
        var found = false;
        for(var i=0; i<node.childNodes.length; i++) {
            var res = exports.domToDocumentOffset(node.childNodes[i],target);
            total += res.offset;
            if(res.found === true) {
                found = true;
                break;
            }
        }
        return { found:found, offset:total };
    }
};

exports.documentOffsetToDom = function(root, off) {
    if(root.nodeType == TEXT_NODE) {
        if(off <= root.nodeValue.length) {
            return {found:true, offset:off, node:root};
        }
        return { found:false, offset:off-root.nodeValue.length };
    } else {
        var toff = off;
        for(var i=0; i<root.childNodes.length; i++) {
            var res = exports.documentOffsetToDom(root.childNodes[i],toff);
            if(res.found===true) return res;
            toff = res.offset;
        }
        return {found:false, offset: toff};
    }
};

exports.setCursorAtDom = function(dom, offset) {
    var range = document.createRange();
    range.setStart(dom,offset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
};

exports.setCursorAtModel = function(mod,offset, dom_root) {
    var dom = exports.findDomForModel(mod,dom_root);
    var range = document.createRange();
    range.setStart(dom,offset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
};

