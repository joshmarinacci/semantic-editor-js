/**
 * Created by josh on 7/18/15.
 */
var Dom = require('./dom');
var Model = require('./model');
var editor;


exports.populateKeyDocs = function(elem) {
    for(var stroke in key_to_actions) {
        var li = document.createElement("tr");
        li.innerHTML = "<tr><td>"+stroke+"</td><td>" + key_to_actions[stroke]+"</td>";
        elem.appendChild(li);
    }
};

function makeRangeFromSelection(model,window) {
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
        Dom.modelToDocumentOffset(model.getRoot(), range.start.mod).offset;
    return range;
}

exports.makeRangeFromSelection = makeRangeFromSelection;

exports.styleSelection = function(e,style) {
    stopKeyboardEvent(e);
    var range = makeRangeFromSelection(model,window);
    var changes = Dom.makeStyleTextRange(range,model,style);
    var com_mod = range.start.mod.getParent();
    Dom.applyChanges(changes,model);
    fireEvent('change',{});
    var com_dom = Dom.findDomForModel(com_mod,editor);
    Dom.rebuildDomFromModel(com_mod,com_dom,editor, document);
    var nmod = Dom.documentOffsetToModel(model.getRoot(),range.documentOffset);
    setCursorAtModel(nmod.node, nmod.offset);
};

function setCursorAtModel(mod,offset) {
    var dom = Dom.findDomForModel(mod,editor);
    var range = document.createRange();
    range.setStart(dom,offset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

exports.setCursorAtModel = setCursorAtModel;
function setSelectionAtModel(smod, soff, emod, eoff) {
    var sdom = Dom.findDomForModel(smod,editor);
    var rng = document.createRange();
    rng.setStart(sdom, soff);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rng);
}

function changeBlockStyle(style) {
    var info = Dom.saveSelection(model);
    var mod_b = info.startpos.node.findBlockParent();
    mod_b.style = style;
    Dom.syncDom(editor,model);
    Dom.setSelectionFromPosition(info.startpos);
}

exports.changeBlockStyle = changeBlockStyle;

var browser_keymap = {
    8:"backspace",
    13:"enter",
    37:"arrow-left",
    39:"arrow-right",
    38:"arrow-up",
    40:"arrow-down",
    65:"a",
    66:"b",
    67:"c",
    68:"d",
    69:"e",
    70:"f",
    71:"g",
    72:"h",
    73:"i"
};

var key_to_actions = {
    "arrow-left": "update-current-style",
    "arrow-right": "update-current-style",
    "arrow-up": "update-current-style",
    "arrow-down": "update-current-style",
    "ctrl-d":"delete-forward",
    "cmd-b":"style-bold",
    "backspace":"delete-backward",
    "cmd-i":"style-italic",
    "cmd-shift-c":"style-inline-code",
    "cmd-shift-a":"style-inline-link",
    "cmd-shift-e":"insert-emoji",
    "enter":"split-line",
};

exports.key_to_actions = key_to_actions;

function stopKeyboardEvent(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
}

exports.stopKeyboardEvent = stopKeyboardEvent;
exports.UPDATE_CURRENT_STYLE = 'update-current-style';

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

exports.splitLine = function(e) {
    stopKeyboardEvent(e);
    var range = makeRangeFromSelection(model,window);
    var path = Model.nodeToPath(range.start.mod);
    var com_mod = range.start.mod.findBlockParent().getParent();
    console.log("com_mod = ", com_mod);
    var changes = Dom.makeSplitChange(range,model);
    Dom.applyChanges(changes,model);
    fireEvent('change',{});
    var com_dom = Dom.findDomForModel(com_mod,editor);
    console.log("com dom = ", editor.id);
    Dom.rebuildDomFromModel(com_mod,com_dom, editor, document);
    var new_mod = Model.pathToNode(path,model.getRoot());
    var new_text = model.getNextTextNode(new_mod);
    setCursorAtModel(new_text,0);
};

var actions_map = {
    "style-bold": function(e) {
        exports.styleSelection(e,'bold');
    },
    "style-italic": function(e) {
        exports.styleSelection(e,'italic');
    },
    "split-line":function(e) {
        exports.splitLine(e);
    },
    "delete-backward":function(e) {
        stopKeyboardEvent(e);
        var range = makeRangeFromSelection(model, window);
        if(range.collapsed) {
            range.documentOffset--;
            range.start.offset--;
            if(range.start.offset < 0) {
                var prevtext = model.getPreviousTextNode(range.start.mod);
                if(prevtext == null) {
                    console.log("at the start of the doc. can't go backwards anymore");
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
        fireEvent('change',{});

        //find a parent still in the tree
        while(!com_mod.stillInTree()) com_mod = com_mod.getParent();

        var com_dom = Dom.findDomForModel(com_mod, editor);
        Dom.rebuildDomFromModel(com_mod,com_dom, editor, document);

        var nmod = Dom.documentOffsetToModel(model.getRoot(),range.documentOffset);
        setCursorAtModel(nmod.node, nmod.offset);
    },
    "delete-forward":function(e) {
        stopKeyboardEvent(e);
        var range = makeRangeFromSelection(model, window);
        if(range.collapsed) {
            if(range.end.mod.type !== Model.TEXT) {
                console.log('something weird happened. bailing');
                return;
            }
            range.end.offset++;
            if(range.end.offset > range.end.mod.text.length) {
                var nexttext = model.getNextTextNode(range.end.mod);
                if(nexttext == null) {
                    console.log("at the end of the doc. cant go forward anymore");
                    range.end.offset = range.end.mod.text.length;
                } else {
                    range.end.mod = nexttext;
                    range.end.offset = 1;
                }
            }
        }
        var changes = Dom.makeDeleteTextRange(range,model);
        var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
        Dom.applyChanges(changes,model);
        fireEvent('change',{});
        while(!com_mod.stillInTree()) com_mod = com_mod.getParent();
        var com_dom = Dom.findDomForModel(com_mod,editor);
        Dom.rebuildDomFromModel(com_mod,com_dom,editor, document);
        var nmod = Dom.documentOffsetToModel(model.getRoot(),range.documentOffset);
        setCursorAtModel(nmod.node, nmod.offset);
    },
    "style-inline-code":function(e){
        exports.styleSelection(e,'inline-code');
    },
    "style-inline-link":function(e) {
        stopKeyboardEvent(e);
        console.log("links not implemented");
    },
    /*
    "insert-emoji": function(e) {
        stopKeyboardEvent(e);
        saved_info = dom.saveSelection(model);
        var xy = dom.getCaretClientPosition();
        $("#popup").removeClass("hidden");
        $("#popup").offset({left:xy.x,top:xy.y});
    }
    */
};

actions_map[exports.UPDATE_CURRENT_STYLE] = updateCurrentStyle;

exports.actions_map = actions_map;

exports.handleEvent = function(e) {
    /*
    if(e.keyCode == 13) { //enter key
        stopKeyboardEvent(e);
        var info = dom.saveSelection(model);
        var block = info.startpos.node.findBlockParent();
        if(block.style == 'block-code') {
            model.insertText(info.startpos.node,info.startpos.offset,"\n");
            dom.syncDom(editor,model);
            info.startpos.offset++;
            dom.setSelectionFromPosition(info.startpos);
        } else {
            var parts = splitBlock();
            dom.syncDom(editor,model);
            var block2 = parts[1].findBlockParent();
            dom.setSelectionFromPosition({
                id:block2.id,
                path:[0],
                offset:0,
            });
            fireEvent('change',{});
        }
        return true;
    }
    */

    if(browser_keymap[e.keyCode]) {
        var keyname = browser_keymap[e.keyCode];
        if(e.metaKey && e.shiftKey) {
            var name = "cmd-shift-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    actions_map[action](e);
                    return true;
                }
            }
        }
        if(e.metaKey) {
            var name = "cmd-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    actions_map[action](e);
                    return true;
                }
            }
        }
        if(e.ctrlKey) {
            var name = "ctrl-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    actions_map[action](e);
                    return true;
                }
            }
        }
        var name = ""+keyname;
        if(key_to_actions[name]) {
            var action = key_to_actions[name];
            if(actions_map[action]) {
                actions_map[action](e);
                return true;
            }
        }
    }
    return false;
};

exports.setModel = function(mod) {
    model = mod;
};

exports.setEditor = function(ed) {
    editor = ed;
};


exports.markAsChanged = function() {
    fireEvent('change',{});
};

var listeners = {};
exports.on = function(type, listener) {
    if(!listeners[type]) listeners[type] = [];
    listeners[type].push(listener);
};

function fireEvent(type, data) {
    if(listeners[type]) listeners[type].forEach(function(l){  l(data);  });
}
exports.fireEvent = fireEvent;