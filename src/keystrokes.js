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


exports.styleSelection = function(e,style) {
    exports.stopKeyboardEvent(e);
    var range = exports.makeRangeFromSelection(model,window);
    var changes = Dom.makeStyleTextRange(range,model,style);
    var com_mod = range.start.mod.getParent();
    Dom.applyChanges(changes,model);
    exports.markAsChanged();
    var com_dom = Dom.findDomForModel(com_mod,editor);
    Dom.rebuildDomFromModel(com_mod,com_dom,editor, document);
    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, editor);
};

exports.changeBlockStyle = function(style) {
    var range = exports.makeRangeFromSelection(model, window);
    var mod_b = range.start.mod.findBlockParent();
    mod_b.style = style;
    var par = mod_b.getParent();
    var dom_b = Dom.findDomForModel(par,editor);
    Dom.rebuildDomFromModel(par,dom_b, editor, document);
    exports.markAsChanged();
    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, editor);
};

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

exports.stopKeyboardEvent = function(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
};

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
    exports.stopKeyboardEvent(e);
    var range = exports.makeRangeFromSelection(model,window);
    var path = Model.nodeToPath(range.start.mod);
    var com_mod = range.start.mod.findBlockParent().getParent();
    var changes = Dom.makeSplitChange(range,model);
    Dom.applyChanges(changes,model);
    exports.markAsChanged();
    var com_dom = Dom.findDomForModel(com_mod,editor);
    Dom.rebuildDomFromModel(com_mod,com_dom, editor, document);
    var new_mod = Model.pathToNode(path,model.getRoot());
    var new_text = model.getNextTextNode(new_mod);
    Dom.setCursorAtModel(new_text,0, editor);
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
        exports.stopKeyboardEvent(e);
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
        exports.markAsChanged();

        //find a parent still in the tree
        while(!com_mod.stillInTree()) com_mod = com_mod.getParent();

        var com_dom = Dom.findDomForModel(com_mod, editor);
        Dom.rebuildDomFromModel(com_mod,com_dom, editor, document);

        var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
        Dom.setCursorAtModel(nmod.node, nmod.offset, editor);
    },
    "delete-forward":function(e) {
        exports.stopKeyboardEvent(e);
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
        var changes = Dom.makeDeleteTextRange(range,model);
        var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
        Dom.applyChanges(changes,model);
        exports.markAsChanged();
        while(!com_mod.stillInTree()) com_mod = com_mod.getParent();
        var com_dom = Dom.findDomForModel(com_mod,editor);
        Dom.rebuildDomFromModel(com_mod,com_dom,editor, document);
        var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
        Dom.setCursorAtModel(nmod.node, nmod.offset, editor);
    },
    "style-inline-code":function(e){
        exports.styleSelection(e,'inline-code');
    },
    "style-inline-link":function(e) {
        exports.stopKeyboardEvent(e);
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