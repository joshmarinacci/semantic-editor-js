var Dom = require('./dom');
var Model = require('./model');

exports.deleteBackwards = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    if(range.collapsed === true) {
        range.documentOffset--;
        range.start.offset--;
        var abs = range.start.offset + Model.modelToDocumentOffset(model.getRoot(),range.start.mod).offset;
        var nmod = Model.documentOffsetToModel(model.getRoot(),abs);
        if(nmod.offset < 0) nmod.offset = 0;
        range.start.offset = nmod.offset;
        range.start.mod = nmod.node;
        if(range.start.mod == range.end.mod && range.start.offset == range.end.offset) return;
    }

    editor.applyChange(makeDeleteTextRangeChange(range));
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.deleteForwards = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    if(range.collapsed) {
        if(range.end.mod.type !== Model.TEXT) {
            console.log('something weird happened. bailing');
            return;
        }
        range.end.offset++;
        var abs = range.end.offset + Model.modelToDocumentOffset(model.getRoot(),range.end.mod).offset;
        var nmod = Model.documentOffsetToModel(model.getRoot(),abs);
        range.end.offset = nmod.offset;
        range.end.mod = nmod.node;
    }

    editor.applyChange(makeDeleteTextRangeChange(range));
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.splitLine = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var range = editor.getSelectionRange();
    editor.applyChange(makeSplitBlockChange(range.start));
    editor.setCursorAtDocumentOffset(range.documentOffset,Model.RIGHT_BIAS);
};

exports.styleInlineLink = function(e,editor) {
    exports.stopKeyboardEvent(e);
    console.log("links not implemented");
};

exports.styleSelection = function(e,editor,style) {
    exports.stopKeyboardEvent(e);
    var range = editor.getSelectionRange();
    editor.applyChange(makeStyleSelectionChange(range,style));
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.undo = function(e,editor) {
    exports.stopKeyboardEvent(e);
    editor.undoChange();
};

exports.redo = function(e,editor) {
    exports.stopKeyboardEvent(e);
    editor.redoChange();
};

exports.calculateTextDifference = function(txt1, txt2) {
    var i = 0;
    while(true) {
        if(i >= txt1.length) {
            if(txt2.length > txt1.length) {
                return { same:false, newChar:txt2[i], offset:i }
            }
            return { same:true }
        }
        if(txt1[i] == txt2[i]) {
            i++;
            continue;
        }
        if(txt1[i] == txt2[i+1])          return { same:false, newChar: txt2[i],   offset:i };
        if(txt1.length == txt2.length)    return { same:false, newChar: txt2[i],   offset:i };
        if(txt1.length < txt2.length)     return { same:false, newChar: txt2[i+1], offset:i };
        break;
    }
};

var replacements = {
    'lambda':'\u03BB',
    'theta':'\u0398',
    'qed':'\u220E',
    '---':'\u2014',
    '--':'\u2013'
};

function delegateChange(change) {
    var keys = Object.keys(replacements);
    for(var i=0; i<keys.length; i++) {
        var key = keys[i];
        var cmp = key + ' ';
        var str = change.newText.substring(change.offset-cmp.length+1, change.offset+1);
        if(str == cmp) {
            return change.newText.substring(0,change.offset-cmp.length+1)
            + replacements[key]+' '
            + change.newText.substring(change.offset+1);
        }
    }

    if(change.newChar == '"') {
        var prevchar = change.newText.substring(change.offset-1,change.offset);
        var right_double_quote = '\u201D';
        var left_double_quote = '\u201C';
        var non_breaking_space = String.fromCharCode(160);
        var newChar = '\u201D';
        if(prevchar == ' ' || prevchar == non_breaking_space) {
            newChar = left_double_quote
        } else {
            newChar = right_double_quote;
        }
        return change.newText.substring(0,change.offset)
            + newChar
            + change.newText.substring(change.offset+1);
    }
    return change.newText;
}

function handleTypedLetter(range, editor) {
    if(range.start.mod && range.start.mod.id && range.start.mod.type == Model.TEXT) {
        var dlen = range.start.dom.nodeValue.length;
        var mlen = range.start.mod.text.length;
        if(dlen == mlen+1) {
            var oldText = range.start.mod.text;
            var newText = range.start.dom.nodeValue;
            var diff = exports.calculateTextDifference(oldText,newText);
            var change = {
                oldText:oldText,
                newText:newText,
                newChar:diff.newChar,
                offset:diff.offset
            };
            var newtext = delegateChange(change);
            var ldiff = newtext.length - oldText.length;
            var oldBlock = range.start.mod.findBlockParent();
            var newBlock = exports.copyWithEdit(oldBlock,range.start.mod,newtext);
            editor.applyChange(exports.makeReplaceBlockChange(oldBlock.getParent(),oldBlock.getIndex(),newBlock));
            editor.setCursorAtDocumentOffset(range.documentOffset+ldiff-1);
            return true;
        }
    }
    return false;
}

exports.handlePastedText = function(range,editor) {;
    var dom_root = editor.getDomRoot();
    var model  = editor.getModel();
    var parent_dom  = Dom.findDomBlockParent(range.start.dom, dom_root);
    var start = exports.scanDomBackwardsForMatch(parent_dom,model);
    var end   = exports.scanDomForwardsForMatch(parent_dom,model);
    editor.applyChange(exports.makeChangesFromPasteRange(start,end,editor));
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.handleInput = function(e,editor) {
    var range = editor.getSelectionRange();
    var handled = handleTypedLetter(range,editor);
    if(handled) return;
    exports.handlePastedText(range,editor);
};

exports.changeBlockStyle = function(e, editor, style) {
    exports.stopKeyboardEvent(e);
    var range = editor.getSelectionRange();
    var start_block = range.start.mod.findBlockParent();
    var end_block = range.end.mod.findBlockParent();
    var root = editor.getModel().getRoot();
    var changes = [];
    for(var i=start_block.getIndex(); i<= end_block.getIndex(); i++) {
        var blk = root.child(i);
        var dupe = duplicateBlock(blk).setStyle(style);
        changes.push(exports.makeReplaceBlockChange(blk.getParent(),blk.getIndex(),dupe));
    }
    editor.applyChange(exports.makeComboChange(changes));
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.stopKeyboardEvent = function(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
};

exports.findActionByEvent = function(e, browser_keymap, key_to_actions, actions_map) {
    if(browser_keymap[e.keyCode]) {
        var keyname = ""+browser_keymap[e.keyCode];
        if(e.ctrlKey)  keyname = 'ctrl-'+keyname;
        if(e.shiftKey) keyname = 'shift-'+keyname;
        if(e.metaKey)  keyname = 'cmd-'+keyname;
        if(key_to_actions[keyname]) {
            var action = key_to_actions[keyname];
            if(actions_map[action]) return actions_map[action];
        }
    }
    return null;
};

function makeStyleSelectionChange(range,style) {
    var model = range.start.mod.model;
    var root = model.getRoot();
    var old_start_block = range.start.mod.findBlockParent();
    var old_start_index = old_start_block.getIndex();
    var old_end_block   = range.end.mod.findBlockParent();
    var old_end_index   = old_end_block.getIndex();
    var insideSpan = false;
    var changes = [];
    for(var i=old_start_index; i<=old_end_index; i++) {
        var blk = root.child(i);
        var res = styleWithRange(range,blk,insideSpan,style);
        insideSpan = res.insideSpan;
        changes.push(exports.makeReplaceBlockChange(root,i,res.nodes[0]));
    }
    return exports.makeComboChange(changes);
}

function styleWithRange(range, node, insideSpan,style) {

    if(node == range.start.mod && node == range.end.mod) {
        var before = node.model.makeText(node.text.substring(0,range.start.offset));
        var middle = node.model.makeText(node.text.substring(range.start.offset,range.end.offset));
        var after  = node.model.makeText(node.text.substring(range.end.offset));
        var span = node.model.makeSpan().setStyle(style).append(middle);
        return {
            nodes:[before,span,after],
            insideSpan:false
        }
    }

    if(node == range.start.mod) {
        var before = node.model.makeText(node.text.substring(0,range.start.offset));
        var middle = node.model.makeText(node.text.substring(range.start.offset));
        var span = node.model.makeSpan().setStyle(style).append(middle);
        return {
            nodes:[before,span],
            insideSpan:true
        }
    }

    if(node == range.end.mod) {
        var middle = node.model.makeText(node.text.substring(0,range.end.offset));
        var after  = node.model.makeText(node.text.substring(range.end.offset));
        var span = node.model.makeSpan().setStyle(style).append(middle);
        return {
            nodes:[span,after],
            insideSpan:false
        }
    }

    if(node.type == Model.BLOCK) {
        var new_node = node.model.makeBlock().setStyle(node.style);
        node.content.forEach(function(ch) {
            var ret = styleWithRange(range,ch,insideSpan,style);
            insideSpan = ret.insideSpan;
            ret.nodes.forEach(function(new_ch) {
                new_node.append(new_ch);
            });
        });
        return {
            insideSpan: insideSpan,
            nodes:[new_node]
        }
    }

    if(node.type == Model.TEXT) {
        if(insideSpan) {
            var new_node = node.model.makeText(node.text);
            var span = node.model.makeSpan().setStyle(style).append(new_node);
            return {
                insideSpan: insideSpan,
                nodes: [span]
            }
        } else {
            var new_node = node.model.makeText(node.text);
            return {
                insideSpan: insideSpan,
                nodes: [new_node]
            }
        }
    }
    if(node.type == Model.SPAN) {
        var new_node = node.model.makeSpan().setStyle(node.style);
        node.content.forEach(function(ch) {
            var ret = styleWithRange(range,ch,insideSpan,style);
            insideSpan = ret.insideSpan;
            ret.nodes.forEach(function(new_ch) {
                new_node.append(new_ch);
            });
        });
        return {
            insideSpan: insideSpan,
            nodes:[new_node]
        }
    }
}

exports.copyWithEdit = function(node,target,text) {
    if(node == target)             return node.model.makeText(text);
    if(node.type == Model.TEXT)    return node.model.makeText(node.text);
    if(node.type == Model.BLOCK) {
        var nnode = node.model.makeBlock().setStyle(node.style);
    }
    if(node.type == Model.SPAN) {
        var nnode = node.model.makeSpan().setStyle(node.style);
    }
    node.content.forEach(function(ch) {
        nnode.append(exports.copyWithEdit(ch,target,text));
    });
    return nnode;
};

exports.makeComboChange = function(changes) {
    var copy = changes.slice();
    var revcopy = changes.slice().reverse();
    return {
        redoit: function() {
            copy.forEach(function(cp) { cp.redoit(); });
        },
        undoit: function() {
            revcopy.forEach(function(cp) { cp.undoit(); });
        }
    }
};

function makeSplitBlockChange(start) {
    //make two new blocks to replace the old one
    var oldblock = start.mod.findBlockParent();
    var newtexts = start.mod.model.splitBlockAt(start.mod,start.offset);
    var newblock1 = newtexts[0].findBlockParent();
    var newblock2 = newtexts[1].findBlockParent();
    //do a replace and insert
    var replace = exports.makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock1);
    var insert  = exports.makeInsertBlockChange(oldblock.getParent(),oldblock.getIndex()+1,newblock2);
    return exports.makeComboChange([replace,insert],'split block');
}

function makeDeleteTextRangeChange(range) {
    var old_start_block = range.start.mod.findBlockParent();
    var root = old_start_block.getParent();
    var old_start_index = old_start_block.getIndex();
    var old_end_block   = range.end.mod.findBlockParent();
    var old_end_index   = old_end_block.getIndex();

    var insideDelete = false;
    var changes = [];
    var new_start_block;
    for(var i=old_start_index; i<=old_end_index; i++) {
        var blk = root.child(i);
        var res = deleteWithRange(range,blk,insideDelete);
        if(res[0]==true) insideDelete = true;
        //if first, replace it
        if(i == old_start_index) {
            changes.push(exports.makeReplaceBlockChange(root,i,res[1]));
            new_start_block = res[1];
            continue;
        }
        //if null, then it must be deleted
        if(res[1] == null) {
            changes.push(makeDeleteBlockChange(root,i,blk));
        }
        //if last block, move children to first block
        if(i == old_end_index) {
            var nblk = res[1];
            nblk.content.forEach(function(ch) {
                new_start_block.append(ch);
            });
            changes.push(makeDeleteBlockChange(root,i,blk));
        }
    }
    return exports.makeComboChange(changes);
}

function deleteWithRange(range,node,insideDelete) {
    //if at both start and end
    if(node == range.start.mod && node == range.end.mod) {
        var before = range.start.mod.text.substring(0,range.start.offset);
        var after = range.start.mod.text.substring(range.end.offset);
        var nn = node.model.makeText(before+after);
        return [false,nn];
    }
    //if at start
    if(node.id == range.start.mod.id) {
        var nn = node.model.makeText(range.start.mod.text.substring(0,range.start.offset));
        return [true,nn];
    }
    //if at end
    if(node.id == range.end.mod.id) {
        var nn = node.model.makeText(range.end.mod.text.substring(range.end.offset));
        return [false,nn];
    }
    if(node.type == Model.BLOCK) {
        var nnode = node.model.makeBlock().setStyle(node.style);
    }
    if(node.type == Model.SPAN) {
        var nnode = node.model.makeSpan().setStyle(node.style);
    }
    if(node.type == Model.TEXT) {
        var nnode = node.model.makeText(node.text);
    }

    if(node.childCount() > 0) {
        var i = 0;
        while(i<node.childCount()) {
            var ch = node.content[i];
            var res = deleteWithRange(range,ch,insideDelete);
            if(res[1] != null) {
                nnode.append(res[1]);
                if (res[0] === true) {
                    insideDelete = true;
                }
                if(res[0] === false) {
                    insideDelete = false;
                }
            }
            i++;
        }
    }


    if(nnode.type == Model.BLOCK) {
        if(nnode.childCount() == 0) nnode = null;
        return [insideDelete, nnode];
    }
    if(nnode.type == Model.SPAN) {
        if(nnode.childCount() == 0) nnode = null;
        return [insideDelete, nnode];
    }
    if(insideDelete) nnode = null;
    return [insideDelete, nnode];
}

exports.makeReplaceBlockChange = function(parent, index, newNode) {
    var oldNode = parent.content[index];
    var del = makeDeleteBlockChange(parent, index, oldNode);
    var ins = exports.makeInsertBlockChange(parent, index, newNode);
    return exports.makeComboChange([del, ins],'replace block ' + newNode.id);
};

exports.makeInsertBlockChange = function(parent, index, node) {
    return {
        redoit: function() {
            parent.content.splice(index,0,node);
            node.parent = parent;
        },
        undoit: function() {
            parent.content.splice(index,1);
        }
    }
};

function makeDeleteBlockChange(parent, index, node) {
    return {
        redoit: function() {
            parent.model.findNodeById(node.id).deleteFromParent();
        },
        undoit: function() {
            parent.content.splice(index,0,node);
            node.parent = parent;
        }
    }
}

function duplicateBlock(block) {
    if(block == null) throw new Error('null block. cant duplicate');
    if(block.type == Model.TEXT)   return block.model.makeText(block.text);
    if(block.type == Model.SPAN) {
        var blk = block.model.makeSpan().setStyle(block.style);
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    if(block.type == Model.BLOCK) {
        var blk = block.model.makeBlock().setStyle(block.style);
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    throw new Error('cant duplicate',block);
}


exports.makeChangesFromPasteRange = function(start, end, editor) {
    var model = editor.getModel();
    var changes = [];
    var count = -1;
    var parent = editor.getModel().getRoot();
    for(var i = Dom.domIndexOf(start.dom); i<= Dom.domIndexOf(end.dom); i++) {
        count++;
        var dom = start.dom.parentNode.childNodes[i];
        var mod2 = Dom.rebuildModelFromDom(dom,model, editor.getImportMapping());
        if(mod2 == null) {
            count--;
            continue;
        }
        if(dom == start.dom) {
            var mod1 = start.mod;
            changes.push(exports.makeReplaceBlockChange(parent,mod1.getIndex(),mod2));
            continue;
        }
        if(dom == end.dom) {
            changes.push(exports.makeInsertBlockChange(parent, start.mod.getIndex()+count, mod2));
            continue;
        }
        if(mod2.type == Model.TEXT)  mod2 = model.makeBlock().append(mod2); //wrap it
        if(mod2.type == Model.SPAN)  mod2 = model.makeBlock().append(mod2); //wrap it
        changes.push(exports.makeInsertBlockChange(parent,start.mod.getIndex()+count,mod2));
    }

    return exports.makeComboChange(changes);
};

exports.scanDomForwardsForMatch = function(dom1, model) {
    while(true) {
        var dom1n = Dom.domIndexOf(dom1);
        var len = dom1.parentNode.childNodes.length;
        var mod1 = model.findNodeById(dom1.id);
        if(mod1 == null) {
            //use the last block
            mod1 = model.getRoot().child(model.getRoot().childCount()-1);
        }
        if(dom1n+1 >= len) {
            return {
                dom: dom1,
                mod: mod1
            }
        }
        if(!dom1.id) {
            dom1 = dom1.parentNode.childNodes[dom1n+1];
            continue;
        }

        var dom2 = dom1.parentNode.childNodes[dom1n+1];
        var mod2 = model.findNodeById(dom2.id);
        if(mod2 == null) {
            console.log('counldnt find mod2. continueing');
            dom1 = dom2;
        } else {
            return {
                dom: dom1,
                mod: mod1
            }
        }
    }
};

exports.scanDomBackwardsForMatch = function(dom1, model) {
    while(true) {
        var dom1n = Dom.domIndexOf(dom1);
        if (dom1n <= 0) {
            var mod1 = model.findNodeById(dom1.id);
            if(mod1 == null) mod1 = model.getRoot().child(0);
            return {
                dom: dom1,
                mod: mod1
            }
        }
        var mod1 = model.findNodeById(dom1.id);
        if (mod1 == null) {
            dom1 = dom1.parentNode.childNodes[dom1n - 1];
            continue;
        }

        var dom2 = dom1.parentNode.childNodes[dom1n - 1];
        var mod2 = model.findNodeById(dom2.id);
        if (mod2 == null) {
            dom1 = dom2;
        } else {
            return {
                dom: dom1,
                mod: mod1
            }
        }
    }
};