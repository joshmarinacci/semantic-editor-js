/**
 * Created by josh on 8/1/15.
 */


var Model = require('./model');
var Dom   = require('./dom');
var Keystrokes = require('./keystrokes');

/*
need a consistent mapping between dom nodes and model nodes.  this means we need some sort of map to describe how one goes to the other and reverse. this mapping should include what the developer defined as valid styles, and also heuristics to map unexpected things (say, stuff that was pasted or imported in) back into the system correctly.  so perhaps a list of styles for blocks and spans.  indicate special attributes like links and images. each style name has a css class used to represent it (which is also used in the editor for semantic styling later).  optionally the editor can generate the :after{content} css for each registered style.  the developer should be able to start with a prefab set of styles and add to it or delete from it.  there is a second backup map which maps other html elements to the registered styles.  when converting, if something isn’t in either of the two sets, then it’s mapped into a plain span with any text inside. assuming there is any text. else it’s ignored.

    this single set of mappings, with the backup map, should be used globally throughout the editor.  this means we should have a central editor class that everything is registered to.  the mappings are then passed into the dom/keystroke classes as needed.

    this obviously needs tons of unit tests.

    it also needs a way to preserve metadata across rebuilds

syncing back and forth uses this map
anything which isn't found does a best effort with the fallback import, and then turns it into a span
with any embedded text content. attributes will be lost.

the import mapping is used for importing HTML wholesale, and dealing with arbitrary pasted content
*/

/*
 map style name to node type,
 export HTML tag, inport HTML tag, rendering HTML tag rendering HTML class, special types

 If you want to support a new semantic type, you'll do it here.
 This mapping can also be used to determine the list of block or span styles to, for example,
 generate a drop-down list.
 */
var semantic_map = {

    //blocks

    'body': {
        type:'block',
        import: {
            elements: ['div','p']
        }
    },
    'header': {
        type:'block',
        import: {
            elements: ['h1','h2']
        }
    },
    'subheader': {
        type:'block',
        import: {
            elements: ['h3','h4','h5','h6']
        }
    },
    'block-code': {
        type:'block',
        import: {
            elements: ['pre']
        }
    },
    'block-quote': {
        type:'block',
        import: {
            elements: ['block-quote'],
        }
    },

    'ordered-list': {
        type:'block',
        import: {
            elements: ['ol']
        },
        export: {
            elements: ['ol']
        },
    },
    'unordered-list': {
        type:'block',
        import: {
            elements: ['ul']
        },
        export: {
            elements: ['ul']
        }
    },
    'list-item': {
        type:'block',
        import: {
            elements: ['li']
        },
        export: {
            elements: ['li']
        },
        isListItem:true,
    },

    //spans

    'plain': {
        type:'span',
        import: {
            elements:['span']
        },
        export: {
            elements:['span']
        }
    },
    'emphasis': {
        type:'span',
        import: {
            elements: ['i','em']
        },
        export: {
            elements: ['em']
        }
    },
    'strong': {
        type:'span',
        import: {
            elements: ['b','strong'],
        },
        export: {
            elements: ['strong']
        }
    },
    'link': {
        type:'span',
        import: {
            elements:['a']
        },
        export: {
            elements:['a']
        },
        isLink:true
    },
    'delete': {
        type:'span',
        import: {
            elements: ['strike','delete']
        },
        export: {
            elements: ['delete']
        }
    },
    'inline-code': {
        import: {
            elements:['code'],
        },
        export: {
            elements: ['code']
        }
    },

    //misc
    'image': {
        type:'span',
        import: {
            elements: ['img']
        },
        export: {
            elements: ['img']
        },
        isImage: true
    },
    '#comment': {
        skip: true
    },
    '#text': {
        type:'text'
    },
    'video': {
        type:'span'
    }
};

var fallback_import_map = {
    'br':'span',
    'cite':'emphasis'
};

var mapping_cache = {};

/*
suppose you wanted to make control R style text with bold, you'd
add a keymap for

"control-r":"style-strong",

If you wanted to make command shift E insert the text poop you'd
first add a keymap for

"command-shift-e":"insert-poop",

then add the action:

"insert-poop": {
    consume: true,
    fun: function(event, selection, editor) {
        editor.insertTextAtSelection("poop",selection);
    }
}

To make command shift E insert the poop emoji, you'd do:

"insert-poop": {
    consume: true,
    fun: function(event, selection, editor) {
        editor.insertTextAtSelection("poop",selection);
    }
}

by using these semantic actions like insertTextAtSelection
it will do all of the proper wordprocessory things like
replacing the selection with the text if something is selected,
or else inserting at the current cursor point and moving the
cursor forward the correct amount. it also inserts the change
into the undo stack so that undo and redo work correctly.





you must manually attach the editor's main key listener to the document. this give you
the opportunity to filter events before the editor does anything with them,
or synthesize or proxy events.

*/

var actions_map = {
    "style-strong": {
        consume: true,
        fun: function(event, selection, editor) {
            editor.styleSelection(event, selection, 'strong');
        }
    },
    "style-emphasis": {
        consume:true,
        fun: function(event, selection, editor) {
            editor.styleSelection(event, selection, 'emphasis');
        }
    },
    "style-inline-code": {
        consume:true,
        fun: function(event, selection, editor) {
            editor.styleSelection(event, selection, 'inline-code');
        }
    },
    "delete-forward": {
        consume:true,
        fun: function(event, selection, editor) {
            editor.deleteSelectionForward(event,selection);
        }
    },
    "delete-backward": {
        consume:true,
        fun: function(event, selection, editor) {
            editor.deleteSelectionBackward(event,selection);
        }
    },
    "split-block": {
        consume:true,
        fun: function(event, selection, editor) {
            editor.splitBlock(event,selection);
        }
    }
};

var code_key_map = {
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

var key_action_map = {
    "ctrl-d":       "delete-forward-one",
    "backspace":    "delete-backward-one",

    "cmd-b":        "style-strong",
    "cmd-i":        "style-emphasis",

    "cmd-shift-c":  "style-inline-code",
    "cmd-shift-a":  "style-inline-link",
    "enter":        "split-block"
};



/*

get a list of block styles
get a list of span styles
get a list of key-mappings and the actions they map to.
get a list of actions and keys which map to them.

get the style at a particular position
get the current cursor position
convert document position to dom position to xy and back

import and export HTML
import and export plain text
import and export JSON
get and set the model


visitors for:
    every text node from a start and stop point
    exit visitor in the middle
    optionally determine which paths to go down




add a key-mapping.  this maps a particular key or set of keys to an action by name
add an action by name
get a list of all actions and the keys which trigger them


*/


/*
 to find out when certain things happen, register for events with 'on'.

handlers will always be called with an error and an event. 99% of the time
the error will be null, but this is for consistency with other node modules.


'possible-paste': whenever text other than simple characters are entered. indicates some html was probably
 pasted. in the future this will be more reliable as we get access to the clip board.
'insert': whenever text is inserted
'cursor-changed': whenever the cursor moves because of inserting/deleting or just moving the arrow keys


you can also fire custom events with the fire() function. This lets you use the editor as a place for diferent
parts of the program to rendezvous. ex: you could fire an event after you get JSON and save it to disk. The editor
doesn't know or care that you saved something, but other event listeners might, so you can fire the save event and
anything listening for that event can do something. ex: render a 'saved' indicator at the top of the screen and
flip the dirty indicator to green.





 */