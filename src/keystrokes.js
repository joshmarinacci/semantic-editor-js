/**
 * Created by josh on 7/18/15.
 */
var Dom = require('./dom');
var Model = require('./model');

exports.populateKeyDocs = function(elem) {
    for(var stroke in key_to_actions) {
        var li = document.createElement("tr");
        li.innerHTML = "<tr><td>"+stroke+"</td><td>" + key_to_actions[stroke]+"</td>";
        elem.appendChild(li);
    }
};

exports.makeRangeFromSelection = function(model,window) {
    var selection = window.getSelection().getRangeAt(0);
    var range = {
        start: {
            dom: selection.startContainer,
            mod: Dom.findModelForDom(model, selection.startContainer),
            offset: selection.startOffset
        },
        end: {
            dom: selection.endContainer,
            mod: Dom.findModelForDom(model, selection.endContainer),
            offset: selection.endOffset
        }
    };
    range.collapsed = selection.collapsed;
    range.documentOffset =
        range.start.offset +
        Model.modelToDocumentOffset(model.getRoot(), range.start.mod).offset;
    return range;
};

exports.styleSelection = function(e,editor,style) {
    var model = editor.getModel();
    exports.stopKeyboardEvent(e);
    var range = exports.makeRangeFromSelection(model,window);
    var changes = Dom.makeStyleTextRange(range,model,style);
    var com_mod = range.start.mod.getParent();
    Dom.applyChanges(changes,model);
    editor.markAsChanged();
    var dom_root = editor.getDomRoot();
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, document, editor.getMapping());
    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, dom_root);
};

exports.changeBlockStyle = function(style, editor) {
    var model = editor.getModel();
    var range = exports.makeRangeFromSelection(model, window);
    var mod_b = range.start.mod.findBlockParent();
    mod_b.style = style;
    var par = mod_b.getParent();
    var dom_root = editor.getDomRoot();
    var dom_b = Dom.findDomForModel(par,dom_root);
    Dom.rebuildDomFromModel(par,dom_b, dom_root, document, editor.getMapping());
    editor.markAsChanged();
    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, dom_root);
};

exports.stopKeyboardEvent = function(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
};

//exports.UPDATE_CURRENT_STYLE = 'update-current-style';

/*
function updateCurrentStyle() {
    setTimeout(function() {
        var info = Dom.saveSelection(model);
        var node = info.startpos.node;
        var styleInfo = {
            type:node.type,
            id:node.id,
            node:node,
            offset:info.startpos.offset,
            spanStyles:[],
            blockStyles:[]
        };
        while(true) {
            node = node.getParent();
            if(node.getParent() == null) break;
            if(node.type == 'span') {
                styleInfo.spanStyles.push(node.style);
            }
            if(node.type == 'block') {
                styleInfo.blockStyles.push(node.style);
            }
        }
        fireEvent(exports.UPDATE_CURRENT_STYLE,styleInfo);
    },10);
}
*/

exports.styleBold = function(e,editor) {
    exports.styleSelection(e,editor,'strong');
};

exports.styleItalic = function(e,editor) {
    exports.styleSelection(e,editor,'emphasis');
};

exports.splitLine = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = exports.makeRangeFromSelection(model,window);
    var path = Model.nodeToPath(range.start.mod);
    var com_mod = range.start.mod.findBlockParent().getParent();
    var changes = Dom.makeSplitChange(range,model);
    Dom.applyChanges(changes,model);
    editor.markAsChanged();
    var dom_root = editor.getDomRoot();
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom, dom_root, document, editor.getMapping());
    var new_mod = Model.pathToNode(path,model.getRoot());
    var new_text = model.getNextTextNode(new_mod);
    Dom.setCursorAtModel(new_text,0, dom_root);
};

exports.deleteBackwards = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = exports.makeRangeFromSelection(model, window);
    if(range.collapsed) {
        range.documentOffset--;
        range.start.offset--;
        if(range.start.offset < 0) {
            var prevtext = model.getPreviousTextNode(range.start.mod);
            if(prevtext == null) {
                range.start.offset = 0;
            } else {
                range.start.mod = prevtext;
                range.start.offset = prevtext.text.length;
            }
        }
    }

    var changes = Dom.makeDeleteTextRange(range,model);
    var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
    Dom.applyChanges(changes,model);
    editor.markAsChanged();
    var dom_root = editor.getDomRoot();

    //find a parent still in the tree
    while(!com_mod.stillInTree()) com_mod = com_mod.getParent();

    var com_dom = Dom.findDomForModel(com_mod, dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom, dom_root, document, editor.getMapping());

    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, dom_root);
};

exports.deleteForwards = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = exports.makeRangeFromSelection(model, window);
    if(range.collapsed) {
        if(range.end.mod.type !== Model.TEXT) {
            console.log('something weird happened. bailing');
            return;
        }
        range.end.offset++;
        if(range.end.offset > range.end.mod.text.length) {
            var nexttext = model.getNextTextNode(range.end.mod);
            if(nexttext == null) {
                range.end.offset = range.end.mod.text.length;
            } else {
                range.end.mod = nexttext;
                range.end.offset = 1;
            }
        }
    }
    var dom_root = editor.getDomRoot();
    var changes = Dom.makeDeleteTextRange(range,model);
    var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
    Dom.applyChanges(changes,model);
    editor.markAsChanged();
    while(!com_mod.stillInTree()) com_mod = com_mod.getParent();
    var com_dom = Dom.findDomForModel(com_mod,dom_root);
    Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, document, editor.getMapping());
    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, dom_root);
};

exports.styleInlineCode = function(e,editor) {
    exports.styleSelection(e,editor,'inline-code');
};

exports.styleInlineLink = function(e,editor) {
    exports.stopKeyboardEvent(e);
    console.log("links not implemented");
};

//actions_map[exports.UPDATE_CURRENT_STYLE] = updateCurrentStyle;
//exports.actions_map = actions_map;
exports.findActionByEvent = function(e, browser_keymap, key_to_actions, actions_map) {
    //console.log("keycode = ", e.keyCode);
    if(browser_keymap[e.keyCode]) {
        var keyname = browser_keymap[e.keyCode];
        //console.log("matched the keycode",e.keyCode, keyname)
        if(e.metaKey && e.shiftKey) {
            var name = "cmd-shift-"+keyname;
            //console.log("checking",name);
            //console.log("actions = ", key_to_actions);
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    return actions_map[action];
                }
            }
        }
        if(e.metaKey) {
            var name = "cmd-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    return actions_map[action];
                }
            }
        }
        if(e.ctrlKey) {
            var name = "ctrl-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    return actions_map[action];
                }
            }
        }
        var name = ""+keyname;
        if(key_to_actions[name]) {
            var action = key_to_actions[name];
            if(actions_map[action]) {
                return actions_map[action];
            }
        }
    }
    return null;
};

function cleanChildren(blk) {
    var i=0;
    while(i<blk.content.length) {
        var ch = blk.content[i];
        if(ch.childCount() > 0) cleanChildren(ch);
        if(ch.type == Model.TEXT && ch.text.trim() == "") {
            blk.content.splice(i,1);
            continue;
        }
        if(ch.type != Model.TEXT && ch.childCount() == 0) {
            blk.content.splice(i,1);
            continue;
        }
        i++;
    }
}
exports.handleInput = function(e,editor) {
    var wrange = window.getSelection().getRangeAt(0);
    var dom_root = editor.getDomRoot();
    var model  = editor.getModel();

    var range = exports.makeRangeFromSelection(model,window);
    console.log('the range is',range);
    var changeRange = Dom.calculateChangeRange(model,dom_root,range.start);
    console.log("the change is",changeRange);

    if(changeRange.start.mod == changeRange.end.mod && changeRange.start.mod.type == Model.TEXT) {
        console.log("the same text node. probably just typing");
        console.log("the old text is", changeRange.start.mod.text);
        console.log("the new text is", changeRange.start.dom.nodeValue);
        var chg = makeBlockReplaceChnage(changeRange.start);
        editor.applyChange(chg);
        editor.syncDom();
        editor.markAsChanged();
        return;
    }

    var doff = wrange.startOffset + Dom.domToDocumentOffset(dom_root,wrange.startContainer).offset;
    //rebuild the model root and swap it in
    var model2 = Dom.rebuildModelFromDom(dom_root, model, editor.getImportMapping());
    model.getRoot().content = model2.content;
    model.getRoot().content.forEach(function(blk){
        blk.parent = model.getRoot();
    });

    //clean up the model because pasting might have messed up some stuff
    cleanChildren(model.getRoot());
    editor.syncDom();

    //set the cursor back
    var offd = Dom.documentOffsetToDom(dom_root,doff);
    Dom.setCursorAtDom(offd.node, offd.offset);
    editor.markAsChanged();
};

exports.undo = function(e,editor) {
    console.log('undoing');
    exports.stopKeyboardEvent(e);
    editor.undoChange();
    editor.syncDom();
    editor.markAsChanged();
};

exports.redo = function(e,editor) {
    console.log("redoing");
    exports.stopKeyboardEvent(e);
    editor.redoChange();
    editor.syncDom();
    editor.markAsChanged();
};

function makeBlockReplaceChnage(req) {
    console.log("old text is", req.mod.text);
    console.log("new text is", req.dom.nodeValue);
    var oldblock = req.mod.findBlockParent();
    var newblock = duplicateBlock(oldblock);
    var newtext = newblock.child(req.mod.getIndex());
    newtext.text = req.dom.nodeValue;
    return makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock);
}

function makeReplaceBlockChange(parent, index, newNode) {
    var oldNode = parent.content[index];
    var del = makeDeleteBlockChange(parent, index, oldNode);
    var ins = makeInsertBlockChange(parent, index, newNode);
    return makeComboChange(del,ins,'replace block');
}

function makeInsertBlockChange(parent, index, node) {
    return {
        redoit: function() {
            console.log("doing insert");
            parent.content.splice(index,0,node);
            node.parent = parent;
        },
        undoit: function() {
            console.log('undoing insert');
            parent.content.splice(index,1);
        }
    }
}
function makeDeleteBlockChange(parent, index, node) {
    return {
        redoit: function() {
            console.log("doing delete");
            parent.content.splice(index,1);
        },
        undoit: function() {
            console.log("undoing delete");
            parent.content.splice(index,0,node);
            node.parent = parent;
        }
    }
}

function duplicateBlock(block) {
    if(block == null) throw new Error('null block. cant duplicate');
    if(block.type == Model.TEXT) {
        var blk = block.model.makeText(block.text);
        return blk;
    }
    if(block.type == Model.SPAN) {
        var blk = block.model.makeSpan();
        blk.style = block.style;
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    if(block.type == Model.BLOCK) {
        var blk = block.model.makeBlock();
        blk.style = block.style;
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    throw new Error('cant duplicate',block);
}
function makeComboChange(chg1, chg2, name) {
    return {
        redoit: function() {
            console.log("doing "+name);
            chg1.redoit();
            chg2.redoit();
        },
        undoit: function() {
            console.log("undoing "+name);
            chg2.undoit();
            chg1.undoit();
        }
    }
}
