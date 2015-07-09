/**
 * Created by josh on 7/8/15.
 */

var _id_count = 0;
exports.genId = function() {
    _id_count++;
    return "id_"+_id_count;
}

var DEFAULT_BLOCK_STYLE = 'body';

function DNode(type,text) {
    this.type = type;
    this.id = exports.genId();
    this.style = DEFAULT_BLOCK_STYLE;

    if(type == 'block' || type == 'span' || type == 'root') {
        this.content = [];
        this.append = function(node) {
            this.content.push(node);
        }
        this.child = function(index) {
            return this.content[index];
        }
    }
    if(type == 'text') {
        this.text = text;
    }
}

var TEXT = 'text';

function countChars(par) {
    var total = 0;
    if(par.content) {
        par.content.forEach(function(n){
            total += countChars(n);
        })
    }
    if(par.type == TEXT) {
        return par.text.length;
    }
    return total;
}

function flattenChars(par) {
    if(par.content) return par.content.map(flattenChars).join("");
    if(par.type == TEXT) return par.text;
    throw new Error("SHOULDNT BE HERE");
}

function DModel() {
    var root = new DNode('root');

    this.makeBlock = function() {
        return new DNode('block');
    };
    this.makeText = function(text) {
        return new DNode(TEXT,text);
    };
    this.append = function(node) {
        root.append(node);
    };

    this.countCharacters = function() {
        return countChars(root);
    };

    this.insertText = function(node, offset, text) {
        if(node.type == TEXT) {
            node.text = node.text.substring(0,offset) + text + node.text.substring(offset);
        }
    };

    this.deleteText = function(startNode, startOffset, endNode, endOffset) {
        if(startNode !== endNode) {
            startNode.text = startNode.text.substring(0, startOffset);
            endNode.text = endNode.text.substring(endOffset);
            return;
        }

        if(startNode.type !== TEXT) throw new Error("can't delete from non text yet");
        if(startOffset > endOffset) throw new Error("start offset can't be greater than end offset");
        startNode.text = startNode.text.substring(0,startOffset)
            + startNode.text.substring(endOffset);
    };

    this.toPlainText = function() {
        return flattenChars(root);
    };

    this.getRoot = function() { return root};
}

exports.makeModel = function() {
    return new DModel();
};





var _model = null;
exports.load = function(json) {
    _model = json;
}

exports.model = function() {
    return _model;
}



//TODO: this function is a hack. should be replaced by just giving children refs to parent
function findParentOfModelNode(root,target) {
    for(var i=0; i<root.content.length; i++) {
        var node = root.content[i];
        if(node.id == target.id) {
            return root;
        }
        if(node.type == 'block' || node.type == 'inline') {
            var ans = findParentOfModelNode(node,target);
            if(ans != null) return ans;
        }
    }
    return null;
}

//TODO: this function is a hack. should be replaced by just giving children refs to parent
function findIndexOfChild(parent,child) {
    var n = 0;
    for(var i=0; i<parent.content.length; i++) {
        if(parent.content[i] == child) return i;
    }
    return -1;
}

//replaces the first node in it's parent with the rest of the nodes
function swapNode() {
    var args = Array.prototype.slice.call(arguments);
    var oldnode = args.shift();
    var rest = args;
    var parent = findParentOfModelNode({content:_model},oldnode);
    var index = findIndexOfChild(parent,oldnode);
    var cargs = [index,1].concat(rest);
    parent.content.splice.apply(parent.content,cargs);
}

//splits a text node in half at the requested offset
function splitModelNode(n,mod) {
    if(mod.type != 'text') {
        console.log("ERROR: don't know how to split non text node yet");
        return;
    }
    var a = {
        type:mod.type,
        id:exports.genId(),
        content:mod.content.substring(0,n)
    };
    var b = {
        type:mod.type,
        id:exports.genId(),
        content:mod.content.substring(n)
    };

    swapNode(mod,a,b);
    return [a,b];
}

exports.findModelForDom = function(root,target) {
    for(var i=0; i<root.content.length; i++) {
        var node = root.content[i];
        if(node.id == target.id) {
            return node;
        }
        if(node.type == 'block' || node.type == 'inline') {
            var ans = exports.findModelForDom(node,target);
            if(ans != null) return ans;
        }
    }
    return null;
}


exports.wrapTextInInlineStyle = function(node,style) {
    var inline = {
        id:exports.genId(),
        type:'inline',
        style:style,
        content: [ {
            id:exports.genId(),
            type:'text',
            content:node.content
        } ]
    };
    swapNode(node,inline);
}

exports.splitThree = function(node,index1,index2) {
    var parts1 = splitModelNode(index1,node);
    var parts2 = splitModelNode(index2-index1,parts1[1]);
    return [parts1[0],parts2[0],parts2[1]];
}
