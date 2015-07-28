/**
 * Created by josh on 7/18/15.
 */
var dom = require('./dom');
var Dom = dom;
var doc = require('./model');
var editor;


exports.populateKeyDocs = function(elem) {
    for(var stroke in key_to_actions) {
        var li = document.createElement("tr");
        li.innerHTML = "<tr><td>"+stroke+"</td><td>" + key_to_actions[stroke]+"</td>";
        elem.appendChild(li);
    }
};


function splitThree(node,index1,index2,model) {
    var parts1 = model.splitNode(node,index1);
    var parts2 = model.splitNode(parts1[1],index2-index1);
    return [parts1[0],parts2[0],parts2[1]];
}

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
    return range;
}

exports.styleSelection = function(e,style) {
    stopKeyboardEvent(e);
    var range = makeRangeFromSelection(model,window);
    var changes = Dom.makeStyleTextRange(range,model,style);
    var com_mod = range.start.mod.getParent();
    Dom.applyChanges(changes,model);
    var com_dom = Dom.findDomForModel(com_mod,editor);
    Dom.rebuildDomFromModel(com_mod,com_dom,editor, document);
    setSelectionAtModel(
        range.start.mod,
        range.start.mod.text.length,
        range.end.mod,
        range.end.offset
    );
    fireEvent('change',{});
};

function setCursorAtModel(mod,offset) {
    var dom = Dom.findDomForModel(mod,editor);
    var range = document.createRange();
    range.setStart(dom,offset);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function setSelectionAtModel(smod, soff, emod, eoff) {
    var sdom = Dom.findDomForModel(smod,editor);
    var rng = document.createRange();
    rng.setStart(sdom, soff);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rng);
}

function changeBlockStyle(style) {
    var info = dom.saveSelection(model);
    var mod_b = info.startpos.node.findBlockParent();
    mod_b.style = style;
    dom.syncDom(editor,model);
    dom.setSelectionFromPosition(info.startpos);
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
    "enter":"split-line"
};

function stopKeyboardEvent(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
}

exports.UPDATE_CURRENT_STYLE = 'update-current-style';

function updateCurrentStyle() {
    setTimeout(function() {
        var info = dom.saveSelection(model);
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

function wrapTextInInlineStyle(node,style,model) {
    var inline = model.makeSpan();
    inline.style = style;
    model.swapNode(node,inline);
    inline.append(node);
    return inline;
};

exports.splitLine = function(e) {
    stopKeyboardEvent(e);
    var range = makeRangeFromSelection(model,window);
    var path = Model.nodeToPath(range.start.mod);
    var com_mod = range.start.mod.findBlockParent().getParent();
    console.log("com_mod = ", com_mod);
    var changes = Dom.makeSplitChange(range,model);
    Dom.applyChanges(changes,model);
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
        if(window.getSelection().getRangeAt(0).collapsed === false) {
            var range = makeRangeFromSelection(model, window);
        } else {
            var range = makeRangeFromSelection(model, window);
            range.start.offset--;
            if(range.start.offset < 0) {
                var prevtext = model.getPreviousTextNode(range.start.mod);
                range.start.mod = prevtext;
                range.start.offset = prevtext.text.length;
            }
        }

        var changes = Dom.makeDeleteTextRange(range,model);
        var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
        Dom.applyChanges(changes,model);
        var com_dom = Dom.findDomForModel(com_mod,dom_root);
        Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, document);
        setCursorAtModel(range.start.mod,range.start.offset);
    },
    "delete-forward":function(e) {
        stopKeyboardEvent(e);
        if(window.getSelection().getRangeAt(0).collapsed === false) {
            var range = makeRangeFromSelection(model, window);
        } else {
            var range = makeRangeFromSelection(model, window);
            range.end.offset++;
            if(range.end.offset > range.end.mod.text.length) {
                var nexttext = model.getNextTextNode(range.end.mod);
                range.end.mod = nexttext;
                range.end.offset = 0;
            }
        }

        var changes = Dom.makeDeleteTextRange(range,model);
        var com_mod = Dom.findCommonParent(range.start.mod,range.end.mod);
        Dom.applyChanges(changes,model);

        var com_dom = Dom.findDomForModel(com_mod,dom_root);
        Dom.rebuildDomFromModel(com_mod,com_dom,dom_root, document);
        setCursorAtModel(range.start.mod,range.start.offset);
    },
    "style-inline-code":function(e){
        exports.styleSelection(e,'inline-code');
    },
    "style-inline-link":function(e) {
        stopKeyboardEvent(e);
        var info = dom.saveSelection(model);
        var style = model.getStyles().inline.link;

        if(info.startpos.node != info.endpos.node) {
            console.log("can't link across blocks");
            return;
        }
        var parts = splitThree(
            info.startpos.node,
            info.startpos.offset,
            info.endpos.offset,
            model);
        var span = wrapTextInInlineStyle(parts[1],style,model);
        span.meta = {};
        span.meta.elementName = "A";

        $('#link-modal-text').val(parts[1].text);
        $('#link-modal').modal('show');
        $("#link-modal-submit").click(function(e) {
            $(this).unbind(e);
            $('#link-modal').modal('hide');
            var text = $('#link-modal-text').val();
            var url  = $('#link-modal-url').val();
            span.meta.href = url;
            dom.syncDom(editor,model);
            fireEvent('change',{});
        });
        fireEvent('change',{});
    },
    "insert-emoji": function(e) {
        stopKeyboardEvent(e);
        saved_info = dom.saveSelection(model);
        var xy = dom.getCaretClientPosition();
        $("#popup").removeClass("hidden");
        $("#popup").offset({left:xy.x,top:xy.y});
    }
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
