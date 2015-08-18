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

    var chg = makeDeleteTextRangeChange2(range,model);
    editor.applyChange(chg);
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

    var chg = makeDeleteTextRangeChange2(range,model);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.splitLine = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    var chg = makeSplitBlockChange(range.start);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.styleBold = function(e,editor) {
    exports.styleSelection(e,editor,'strong');
};

exports.styleItalic = function(e,editor) {
    exports.styleSelection(e,editor,'emphasis');
};

exports.styleInlineCode = function(e,editor) {
    exports.styleSelection(e,editor,'inline-code');
};

exports.styleInlineLink = function(e,editor) {
    exports.stopKeyboardEvent(e);
    console.log("links not implemented");
};

exports.styleSelection = function(e,editor,style) {
    exports.stopKeyboardEvent(e);
    var range = editor.getSelectionRange();
    var chg = makeStyleSelectionChange2(range,style);
    editor.applyChange(chg);
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
                //console.log("it's longer");
                return {
                    same:false,
                    newChar:txt2[i],
                    newString:txt2[i],
                    offset:i
                }
            }
            return {
                same:true
            }
        }
        var ch1 = txt1[i];
        var ch2 = txt2[i];
        if(ch1 == ch2) {
            i++;
            continue;
        }
        //console.log("they differ",ch1,ch2, ch1.charCodeAt(0), ch2.charCodeAt(0), txt1.length,txt2.length);
        var ch2b = txt2[i+1];
        if(ch1 == ch2b) {
            //console.log('inserted char',ch2);
            return {
                same:false,
                newChar: ch2,
                newString:ch2,
                offset:i
            }
        }
        if(txt1.length == txt2.length) {
            //console.log("changed a char");
            return {
                same:false,
                newChar:ch2,
                newString:ch2,
                offset:i
            }
        }
        if(txt1.length < txt2.length) {
            //console.log("changed and inserted");
            return {
                same:false,
                newChar:txt2.substring(i+1,i+2),
                newString: txt2.substring(i,i+2),
                offset:i
            }
        }

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
        console.log("prevchar is",prevchar);
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
                newString:diff.newString,
                newChar:diff.newChar,
                offset:diff.offset
            };
            var newtext = delegateChange(change);
            var ldiff = newtext.length - oldText.length;
            var oldBlock = range.start.mod.findBlockParent();
            var newBlock = copyWithEdit(oldBlock,range.start.mod,newtext);
            var chg = makeReplaceBlockChange(oldBlock.getParent(),oldBlock.getIndex(),newBlock);
            editor.applyChange(chg);
            editor.setCursorAtDocumentOffset(range.documentOffset+ldiff-1);
            return true;
        }
    }
    return false;
}

exports.handlePastedText = function(range,editor) {;
    var dom_root = editor.getDomRoot();
    var model  = editor.getModel();
    var pdom  = Dom.findDomBlockParent(range.start.dom, dom_root);
    //console.log("start dom is",range.start.dom);
    var start = exports.scanDomBackwardsForMatch(pdom,model);
    var end   = exports.scanDomForwardsForMatch(pdom,model);
    //console.log("pdom = ",pdom.id);
    //console.log("scanned backwards for",start.dom.id,start.mod.id);
    //console.log("scanned forwards for",end.dom.id,end.mod.id);
    editor.applyChange(exports.makeChangesFromPasteRange(start,end,editor));
    //console.log('doc offset is',range.documentOffset);
    editor.setCursorAtDocumentOffset(range.documentOffset);
}

exports.handleInput = function(e,editor) {
    var range = editor.getSelectionRange();
    //console.log("dom is");
    //Dom.print(editor.getDomRoot());
    //console.log("model is");
    //Model.print(model);

    var handled = handleTypedLetter(range,editor);
    if(handled) return;
    exports.handlePastedText(range,editor);

    //Model.print(editor.getModel());
};

exports.changeBlockStyle = function(style, editor) {
    var model = editor.getModel();
    var range = editor.getSelectionRange();
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

exports.makeBlockStyleChange = function(range, style) {
    var target_node = range.start.mod;
    var target_block = target_node.findBlockParent();
    var newblock = duplicateBlock(target_block);
    newblock.style = style;
    return makeReplaceBlockChange(target_block.getParent(),target_block.getIndex(),newblock);
};

exports.stopKeyboardEvent = function(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
};

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

function makeStyleSelectionChange2(range,style) {
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
        changes.push(makeReplaceBlockChange(root,i,res.nodes[0]));
    }
    var chg = changes.shift();
    while(changes.length > 0) {
        chg = makeComboChange(chg,changes.shift(),'combo');
    }
    return chg;

}

function styleWithRange(range, node, insideSpan,style) {
    //console.log('style with range',node.id,insideSpan);

    if(node == range.start.mod && node == range.end.mod) {
        //console.log("start and end node");
        var before = node.model.makeText(node.text.substring(0,range.start.offset));
        var middle = node.model.makeText(node.text.substring(range.start.offset,range.end.offset));
        var after  = node.model.makeText(node.text.substring(range.end.offset));
        //console.log("split text to",before.text,middle.text,after.text);
        var span = node.model.makeSpan();
        span.style = style;
        span.append(middle);
        return {
            nodes:[before,span,after],
            insideSpan:false
        }
    }

    if(node == range.start.mod) {
        //console.log("starting node");
        var before = node.model.makeText(node.text.substring(0,range.start.offset));
        var middle = node.model.makeText(node.text.substring(range.start.offset));
        //console.log("split text to",before.text,middle.text);
        var span = node.model.makeSpan();
        span.style = style;
        span.append(middle);
        return {
            nodes:[before,span],
            insideSpan:true
        }
    }

    if(node == range.end.mod) {
        //console.log("ending node");
        var middle = node.model.makeText(node.text.substring(0,range.end.offset));
        var after  = node.model.makeText(node.text.substring(range.end.offset));
        //console.log("split text to",middle.text,after.text);
        var span = node.model.makeSpan();
        span.style = style;
        span.append(middle);
        return {
            nodes:[span,after],
            insideSpan:false
        }
    }

    if(node.type == Model.BLOCK) {
        var new_node = node.model.makeBlock();
        new_node.style = node.style;
        node.content.forEach(function(ch) {
            var ret = styleWithRange(range,ch,insideSpan,style);
            //console.log("returned node count", ret.nodes.length);
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
        //console.log("middle node", insideSpan);
        if(insideSpan) {
            var new_node = node.model.makeText(node.text);
            var span = node.model.makeSpan();
            span.style = style;
            span.append(new_node);
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
        var new_node = node.model.makeSpan();
        new_node.style = node.style;
        node.content.forEach(function(ch) {
            var ret = styleWithRange(range,ch,insideSpan,style);
            console.log("returned node count", ret.nodes.length);
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

exports.makeReplaceBlockChange = makeReplaceBlockChange;

function copyWithEdit(node,target,text) {
    if(node == target) {
        return node.model.makeText(text);
    }
    if(node.type == Model.TEXT) {
        return node.model.makeText(node.text);
    }
    if(node.type == Model.BLOCK) {
        var nnode = node.model.makeBlock();
        nnode.style = node.style;
    }
    if(node.type == Model.SPAN) {
        var nnode = node.model.makeSpan();
        nnode.style = node.style;
    }
    node.content.forEach(function(ch) {
        nnode.append(copyWithEdit(ch,target,text));
    });
    return nnode;
}

exports.copyWithEdit = copyWithEdit;

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

function makeDeleteTextRangeChange2(range,model) {
    //console.log("deleting with range",range.toString());
    var root = model.getRoot();
    var old_start_block = range.start.mod.findBlockParent();
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
            changes.push(makeReplaceBlockChange(root,i,res[1]));
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
    //merge into one combo change
    var chg = changes.shift();
    while(changes.length > 0) {
        chg = makeComboChange(chg,changes.shift(),'combo');
    }
    return chg;
}

function deleteWithRange(range,node,insideDelete) {
    //console.log("node is",node.id, 'inside delete',insideDelete);
    //if at both start and end
    if(node == range.start.mod && node == range.end.mod) {
        //console.log("entirely within one text node");
        var before = range.start.mod.text.substring(0,range.start.offset);
        var after = range.start.mod.text.substring(range.end.offset);
        var nn = node.model.makeText(before+after);
        return [false,nn];
    }
    //if at start
    if(node.id == range.start.mod.id) {
        var nn = node.model.makeText(range.start.mod.text.substring(0,range.start.offset));
        //console.log("starting node is now",nn.text);
        return [true,nn];
    }
    //if at end
    if(node.id == range.end.mod.id) {
        var nn = node.model.makeText(range.end.mod.text.substring(range.end.offset));
        //console.log("ending node is now",nn.text);
        return [false,nn];
    }
    if(node.type == Model.BLOCK) {
        var nnode = node.model.makeBlock();
        nnode.style = node.style;
    }
    if(node.type == Model.SPAN) {
        var nnode = node.model.makeSpan();
        nnode.style = node.style;
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
        return [insideDelete,nnode];
    }
    if(nnode.type == Model.SPAN) {
        if(nnode.childCount() == 0) nnode = null;
        return [insideDelete,nnode];
    }
    if(insideDelete) nnode = null;
    return [insideDelete,nnode];
}

function makeReplaceBlockChange(parent, index, newNode) {
    var oldNode = parent.content[index];
    var del = makeDeleteBlockChange(parent, index, oldNode);
    var ins = makeInsertBlockChange(parent, index, newNode);
    return makeComboChange(del,ins,'replace block ' + newNode.id);
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

exports.makeInsertBlockChange = makeInsertBlockChange;

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

exports.makeComboChange = makeComboChange;


exports.makeChangesFromPasteRange = function(start,end,editor) {
    var DEBUG = false;
    var model = editor.getModel();
    var changes = [];
    var count = -1;
    //console.log("dom = ");
    if(DEBUG) Dom.print(editor.getDomRoot());
    var parent = editor.getModel().getRoot();
    for(var i = Dom.domIndexOf(start.dom); i<= Dom.domIndexOf(end.dom); i++) {
        if(DEBUG) console.log("-------- at block " + i);
        count++;
        var dom = start.dom.parentNode.childNodes[i];
        var mod2 = Dom.rebuildModelFromDom(dom,model, editor.getImportMapping());
        if(DEBUG) {
            console.log("dom")
            Dom.print(dom);
            console.log("mod")
            Model.print(mod2);
        }
        if(mod2 == null) {
            //console.log("converted to null. skipping");
            count--;
            continue;
        }
        if(dom == start.dom) {
            if(DEBUG) console.log('at start');
            var mod1 = start.mod;
            var chg = exports.makeReplaceBlockChange(parent,mod1.getIndex(),mod2);
            changes.push(chg);
            continue;
        }
        if(dom == end.dom) {
            if(DEBUG) console.log('at end');
            var chg = exports.makeInsertBlockChange(parent, start.mod.getIndex()+count, mod2);
            changes.push(chg);
            continue;
        }
        if(DEBUG) console.log('in the middle');
        if(mod2.type == Model.TEXT) {
            var block = model.makeBlock();
            block.append(mod2);
            mod2 = block;
        }
        if(mod2.type == Model.SPAN) {
            var block = model.makeBlock();
            block.append(mod2);
            mod2 = block;
        }
        if(DEBUG) {
            console.log("final mod");
            Model.print(mod2);
        }
        var chg = exports.makeInsertBlockChange(parent,start.mod.getIndex()+count,mod2);
        changes.push(chg);
    }


    //merge into one combo change
    var chg = changes.shift();
    while(changes.length > 0) {
        chg = exports.makeComboChange(chg,changes.shift(),'combo');
    }

    return chg;
}


exports.scanDomForwardsForMatch = function(dom1, model) {
    while(true) {
        var dom1n = Dom.domIndexOf(dom1);
        var len = dom1.parentNode.childNodes.length;
        //console.log("checking",dom1.id,":",dom1n,'len',len);
        var mod1 = model.findNodeById(dom1.id);
        if(mod1 == null) {
            //use the last block
            mod1 = model.getRoot().child(model.getRoot().childCount()-1);
        }
        //console.log("mod1 = ",mod1?mod1.id:"null");
        if(dom1n+1 >= len) {
            //console.log('at the end');
            return {
                dom: dom1,
                mod: mod1,
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
            //console.log("next is valid and matches",mod2.id);
            return {
                dom: dom1,
                mod: mod1
            }
        }
    }

}

exports.scanDomBackwardsForMatch = function(dom1, model) {
    while(true) {
        var dom1n = Dom.domIndexOf(dom1);
        //console.log("checking",dom1.id,":",dom1n);
        if (dom1n <= 0) {
            //console.log('at the start');
            var mod1 = model.findNodeById(dom1.id);
            if(mod1 == null) {
                mod1 = model.getRoot().child(0);
            }
            //console.log("mod1 = ", mod1.id);
            return {
                dom: dom1,
                mod: mod1
            }
        }
        var mod1 = model.findNodeById(dom1.id);
        if (mod1 == null) {
            //console.log("mod1 not found");
            dom1 = dom1.parentNode.childNodes[dom1n - 1];
            continue;
        }

        var dom2 = dom1.parentNode.childNodes[dom1n - 1];
        //console.log("dom2.id = ", dom2.id);
        var mod2 = model.findNodeById(dom2.id);
        if (mod2 == null) {
            //console.log('cant find the model');
            dom1 = dom2;
        } else {
            //console.log("found it. it's good");
            return {
                dom: dom1,
                mod: mod1
            }
        }
    }


}