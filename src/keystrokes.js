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

exports.styleBold = function(e) {
    exports.styleSelection(e,'bold');
};

exports.styleItalic = function(e) {
    exports.styleSelection(e,'italic');
};

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

exports.deleteBackwards = function(e) {
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
};

exports.deleteForwards = function(e) {
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
};

exports.styleInlineCode = function(e) {
    exports.styleSelection(e,'inline-code');
};

exports.styleInlineLink = function(e) {
    exports.stopKeyboardEvent(e);
    console.log("links not implemented");
};

//actions_map[exports.UPDATE_CURRENT_STYLE] = updateCurrentStyle;
//exports.actions_map = actions_map;
exports.findActionByEvent = function(e, browser_keymap, key_to_actions, actions_map) {
    if(browser_keymap[e.keyCode]) {
        var keyname = browser_keymap[e.keyCode];
        //console.log("matched the keycode",e.keyCode, keyname)
        if(e.metaKey && e.shiftKey) {
            var name = "cmd-shift-"+keyname;
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

/*
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
*/

exports.handleInput = function(e) {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    var start_dom = range.startContainer;
    var start_off = range.startOffset;
    var ssel = {
        start_node: start_dom,
        start_offset: start_off
    };
    var dom_root = editor;
    var range = Dom.calculateChangeRange(model, dom_root, ssel);
    var changes = Dom.calculateChangeList(range);

    Dom.applyChanges(changes, model);
    var com_mod = Dom.findCommonParent(range.start.mod, range.end.mod);
    var com_dom = Dom.findDomForModel(com_mod, dom_root);
    Dom.rebuildDomFromModel(com_mod, com_dom, dom_root, document);
    exports.markAsChanged();
    //renderModelTree(model,document.getElementById("model-tree"));
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