var doc = require('./model');
var Model = doc;

if(typeof document === 'undefined') {
    var TEXT_NODE = 'TEXT_NODE';
    var ELEMENT_NODE = 'ELEMENT_NODE';
    var COMMENT_NODE = 'COMMENT_NODE';
} else {
    var TEXT_NODE = document.TEXT_NODE;
    var ELEMENT_NODE = document.ELEMENT_NODE;
    var COMMENT_NODE = document.COMMENT_NODE;
}


exports.Node = {
    ELEMENT_NODE: ELEMENT_NODE,
    TEXT_NODE: TEXT_NODE,
    COMMENT_NODE: COMMENT_NODE
};
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

exports.domIndexOf = function(dom_child) {
    return Array.prototype.indexOf.call(dom_child.parentNode.childNodes,dom_child);
}


exports.findModelForDom = function(model,domch) {
    if(domch.nodeType == ELEMENT_NODE) {
        return model.findNodeById(domch.id);
    }
    if(domch.nodeType == TEXT_NODE) {
        var parent_mod = exports.findModelForDom(model,domch.parentNode);
        if(parent_mod == null) return null;
        var n = exports.domIndexOf(domch);
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

exports.findDomBlockParent = function(dom, dom_root) {
    if(dom.parentNode == dom_root) return dom;
    return exports.findDomBlockParent(dom.parentNode, dom_root);
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
        console.log("WARNING: no mapping for element of type ",node.nodeName);
        console.log("using generic DIV");
        return genModelFromMapping(mapping['div'],'div',node,mapping,model);
    }
    if(node.nodeType == COMMENT_NODE) return null;
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
        var mod = genModelFromDom(node.childNodes[i],model, mappings);
        if(mod != null) nd.append(mod);
    }
    if(nd.childCount() <= 0) return null;
    return nd;
}

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
    var range = dom_root.ownerDocument.createRange();
    range.setStart(dom,offset);
    if(typeof window !== 'undefined') {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

