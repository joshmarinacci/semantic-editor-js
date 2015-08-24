var doc = require('./model');
var Model = doc;

if(typeof document === 'undefined') {
    exports.Node = {
        ELEMENT_NODE: 'ELEMENT_NODE',
        TEXT_NODE:    'TEXT_NODE',
        COMMENT_NODE: 'COMMENT_NODE'
    };
} else {
    exports.Node = {
        ELEMENT_NODE: document.ELEMENT_NODE,
        TEXT_NODE: document.TEXT_NODE,
        COMMENT_NODE: document.COMMENT_NODE
    };
}


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
    if(parent.tagName == 'DIV') return parent;
    return null;
};

function findParentNonTextNode(dom) {
    var node = dom;
    var path = [];
    while(node.nodeType == exports.Node.TEXT_NODE || node.id == "") {
        var parent = node.parentNode;
        var nn = exports.domIndexOf(node);
        //var nn = -1;
        //for(var i=0; i<parent.childNodes.length; i++) {
        //    if(parent.childNodes[i] == node) {
        //        nn = i;
        //    }
        //}
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
    if(rule && rule.type == type) return rule;
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
        if(!rule.element) throw new Error("MISSING RULE.ELEMENT");
        var elem = document.createElement(rule.element);
        elem.id = mod.id;
        elem.classList.add(mod.style);
        mod.content.forEach(function(modch){
            elem.appendChild(exports.modelToDom(modch,dom,document, mapping));
        });
        //console.log("the mod is",mod);
        if(rule.attributes) {
            rule.attributes.forEach(function(attr){
                elem.setAttribute(attr.attrName,mod.meta[attr.metaName]);
            });
        }
        return elem;
    }
    console.log("didn't match a rule!", mod.type, mod.style);
};

exports.domIndexOf = function(child) {
    return Array.prototype.indexOf.call(child.parentNode.childNodes,child);
};

exports.findModelForDom = function(model,domch) {
    if(domch.nodeType == exports.Node.ELEMENT_NODE) {
        return model.findNodeById(domch.id);
    }
    if(domch.nodeType == exports.Node.TEXT_NODE) {
        var parent_mod = exports.findModelForDom(model,domch.parentNode);
        if(parent_mod == null) return null;
        return parent_mod.child(exports.domIndexOf(domch));
    }
    console.log("UNKNOWN DOM NODE TYPE",domch.nodeType,exports.Node.TEXT_NODE);
};

exports.findDomForModel = function(mod, root) {
    if(!root) throw new Error("dom root is null");
    if(mod == null) throw new Error("model node is null");
    if(mod.type == Model.BLOCK) return root.ownerDocument.getElementById(mod.id);
    if(mod.type == Model.SPAN)  return root.ownerDocument.getElementById(mod.id);
    if(mod.type == Model.ROOT)  return root;
    if(mod.type == Model.TEXT) {
        var dom_par = root.ownerDocument.getElementById(mod.getParent().id);
        return dom_par.childNodes[mod.getIndex()];
    }
    throw new Error("can't handle model node type " + mod.type);
};

exports.findDomBlockParent = function(dom, dom_root) {
    if(dom.parentNode == dom_root) return dom;
    return exports.findDomBlockParent(dom.parentNode, dom_root);
};

exports.print = function(dom,tab) {
    if(!tab) tab = "";
    if(dom.nodeType == exports.Node.ELEMENT_NODE) {
        console.log(tab + dom.nodeName + "#"+dom.id + " " + dom.classList);
        for(var i=0; i< dom.childNodes.length; i++) {
            exports.print(dom.childNodes[i],tab+"  ");
        }
    }
    if(dom.nodeType == exports.Node.TEXT_NODE) console.log(tab + 'TEXT:' + '"' + dom.nodeValue+'"');
};

exports.syncDom = function(dom_root,model, mapping) {
    exports.rebuildDomFromModel(model.getRoot(), dom_root, dom_root, dom_root.ownerDocument, mapping);
};

exports.rebuildDomFromModel = function(mod, dom, dom_root, doc, mapping) {
    if(typeof doc == 'undefined') throw new Error("undefined doc");
    if(mod.type == Model.TEXT) {
        dom.nodeValue = mod.text;
        return;
    }
    clearChildren(dom);
    mod.content.forEach(function(modch){
        dom.appendChild(exports.modelToDom(modch,dom_root,doc,mapping));
    });
    dom.id = mod.id;
};

exports.rebuildModelFromDom = function(dom, model, mapping) {
    return genModelFromDom(dom,model,mapping);
};

function genModelFromDom(node,model, mapping) {
    if(node.nodeType == exports.Node.TEXT_NODE) return model.makeText(node.nodeValue);
    if(node.nodeType == exports.Node.ELEMENT_NODE) {
        var name = node.nodeName.toLowerCase() + '.'+node.className;
        if(mapping[name]) return genModelFromMapping(mapping[name],name,node,mapping, model);
        var name = node.nodeName.toLowerCase();
        if(mapping[name]) return genModelFromMapping(mapping[name],name,node,mapping, model);
        console.log("WARNING: no mapping for element of type ",node.nodeName, "using generic div");
        return genModelFromMapping(mapping['div'],'div',node,mapping,model);
    }
    if(node.nodeType == exports.Node.COMMENT_NODE) return null;
    throw new Error("cant convert dom node " + node.nodeType + " " + node.nodeName);
}

function genModelFromMapping(mp, name, node, mappings, model) {
    var nd = null;
    if(mp.skip === true) return null;
    if(mp.type == 'span')   nd = model.makeSpan().setStyle(mp.style);
    if(mp.type == 'block')  nd = model.makeBlock().setStyle(mp.style);
    if(nd == null) throw new Error("cant convert dom node" + node.nodeName);
    if(mp.isLink === true) nd.meta = { href: node.getAttribute("href") };
    for(var i=0; i<node.childNodes.length; i++) {
        var mod = genModelFromDom(node.childNodes[i], model, mappings);
        if(mod != null) nd.append(mod);
    }
    if(node.id) {
        var old_node = model.findNodeById(node.id);
        if(old_node.meta) {
            nd.meta = old_node.meta;
        }
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
    if (node.nodeType == exports.Node.TEXT_NODE) {
        return { found: false, offset: node.nodeValue.length };
    }
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
};

exports.documentOffsetToDom = function(root, off) {
    if(root.nodeType == exports.Node.TEXT_NODE) {
        if(off <= root.nodeValue.length) return {found:true, offset:off, node:root};
        return { found:false, offset:off-root.nodeValue.length };
    }
    for(var i=0; i<root.childNodes.length; i++) {
        var res = exports.documentOffsetToDom(root.childNodes[i],off);
        if(res.found===true) return res;
        off = res.offset;
    }
    return {found:false, offset: off};
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

