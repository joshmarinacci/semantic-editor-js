/**
 * Created by josh on 7/18/15.
 */
var Dom = require('./dom');
var Model = require('./model');

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
    var chg = makeSplitBlockChange(range.start);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
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

    var chg = makeDeleteTextRangeChange(range,model);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
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

    var chg = makeDeleteTextRangeChange(range,model);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
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
    var changeRange = Dom.calculateChangeRange(model,dom_root,range.start);
    if(changeRange.start.mod == changeRange.end.mod && changeRange.start.mod.type == Model.TEXT) {
        var chg = makeBlockReplaceChange(changeRange.start);
        editor.applyChange(chg);
        editor.setCursorAtDocumentOffset(range.documentOffset);
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
    exports.stopKeyboardEvent(e);
    editor.undoChange();
    editor.syncDom();
    editor.markAsChanged();
};

exports.redo = function(e,editor) {
    exports.stopKeyboardEvent(e);
    editor.redoChange();
    editor.syncDom();
    editor.markAsChanged();
};

function makeBlockReplaceChange(req) {
    var oldblock = req.mod.findBlockParent();
    var newblock = duplicateBlock(oldblock);
    var newtext = newblock.child(req.mod.getIndex());
    newtext.text = req.dom.nodeValue;
    return makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock);
}

function makeSplitBlockChange(start) {
    //make two new blocks to replace the old one
    var oldblock = start.mod.findBlockParent();
    var newtexts = start.mod.model.splitBlockAt(start.mod,start.offset);
    var newblock1 = newtexts[0].findBlockParent();
    var newblock2 = newtexts[1].findBlockParent();
    //do a replace and insert
    var replace = makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock1);
    var insert  = makeInsertBlockChange(oldblock.getParent(),oldblock.getIndex()+1,newblock2);
    return makeComboChange(replace,insert,'split block');
}

//this won't work if there is middle text or spans
function makeDeleteTextRangeChange(range,model) {
    var it = model.getIterator(range.start.mod);
    var ch = range.start.mod;
    while(it.hasNext()){
        //start and end text
        if(ch == range.start.mod && ch == range.end.mod) {
            var oldblock = range.start.mod.findBlockParent();
            var newblock = duplicateBlock(oldblock);
            var oldtext  = range.start.mod;
            var newtext = newblock.child(oldtext.getIndex());
            newtext.text  = oldtext.text.substring(0,range.start.offset)
                + oldtext.text.substring(range.end.offset);
            return makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock);
        }
        //start text
        if(ch == range.start.mod) {
            var oldblock = range.start.mod.findBlockParent();
            var newblock1 = duplicateBlock(oldblock);
            var oldtext  = range.start.mod;
            var newtext = newblock1.child(oldtext.getIndex());
            newtext.text  = oldtext.text.substring(0,range.start.offset);
            ch = it.next();
            continue;
        }
        //end text
        if(ch == range.end.mod) {
            var oldblock2 = ch.findBlockParent();
            var newblock2 = duplicateBlock(oldblock2);
            var oldtext2 = ch;
            var newtext2 = newblock2.child(oldtext2.getIndex());
            newtext2.text = oldtext2.text.substring(range.end.offset);
            newblock1.append(newtext2);
            var replace = makeReplaceBlockChange(oldblock.getParent(), oldblock.getIndex(),newblock1);
            var delete2 = makeDeleteBlockChange(oldblock2.getParent(),oldblock2.getIndex(),oldblock2);
            return makeComboChange(replace,delete2);
        }
        //middle text
        if(ch.type == Model.TEXT) {
            console.log("middle text");
        }
        ch = it.next();
    }

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
            parent.content.splice(index,0,node);
            node.parent = parent;
        },
        undoit: function() {
            parent.content.splice(index,1);
        }
    }
}
function makeDeleteBlockChange(parent, index, node) {
    return {
        redoit: function() {
            parent.content.splice(index,1);
        },
        undoit: function() {
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
            chg1.redoit();
            chg2.redoit();
        },
        undoit: function() {
            chg2.undoit();
            chg1.undoit();
        }
    }
}
