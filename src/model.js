/**
 * Created by josh on 7/8/15.
 */

exports.TEXT = 'text';
exports.SPAN = 'span';
exports.BLOCK = 'block';

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
    this.parent = null;

    if(type == 'block' || type == 'span' || type == 'root') {
        this.content = [];
        this.append = function(node) {
            this.content.push(node);
            node.parent = this;
        };
        this.child = function(index) {
            return this.content[index];
        };
    }
    if(type == exports.TEXT) {
        this.text = text;
    }
}


function countChars(par) {
    var total = 0;
    if(par.content) {
        par.content.forEach(function(n){
            total += countChars(n);
        })
    }
    if(par.type == exports.TEXT) {
        return par.text.length;
    }
    return total;
}

function flattenChars(par) {
    if(par.content) return par.content.map(flattenChars).join("");
    if(par.type == exports.TEXT) return par.text;
    throw new Error("SHOULDNT BE HERE");
}

//this is a post-order traversal. handle children before the parent
function DNodeIterator(thecurrent) {
    var current = thecurrent;
    current.didKids = false;
    //console.log("making a dnode iterator. starting at",current.id);
    var nextNode = calculateNextNode();

    function getIndex(node) {
        var parent = node.parent;
        return parent.content.indexOf(node);
    }
    function getNextSibling(node) {
        if(typeof node.parent == 'undefined') return null;
        if(node.parent == null) return null;
        var n = getIndex(node);
        if(n < node.parent.content.length-1) {
            return node.parent.child(n+1);
        }
        return null;
    }
    function getChildren(node) {
        if(node.content) return node.content;
        return [];
    };
    function hasChildren(node) {
        return (typeof node.content !== 'undefined') && node.content.length > 0;
    }
    this.hasNext = function() { return nextNode !== null };
    this.next = function()    {
        current = nextNode;
        nextNode = calculateNextNode();
        return current;
    }

    var didKids = false;
    function calculateNextNode() {
        //console.log("current is", current.id,'did kids = ',current.didKids, 'has kids = ',hasChildren(current));
        //console.log(current);
        //look at kids first
        if(hasChildren(current) && current.didKids === false) {
            //console.log("we have kids");
            current.didKids = true;
            var ch = current.child(0);
            ch.didKids = false;
            return ch;
        }
        //console.log("no kids for",current.id);

        //no kids. look at sibling next
        var sib = getNextSibling(current);
        if(sib != null) {
            //console.log("can go to the sibling",sib.id);
            sib.didKids = false;
            return sib;
        }

        //console.log("no sibling. have to go up");
        if(current.parent == null) return null;
        var par = current.parent;
        par.didKids = true;
        return par;
    }

    this.deleteNow = function() {
        //console.log("deleting current node", current.id);
        if(current.parent == null) throw new Error("can't delete a node without a parent");
        var n = getIndex(current);
        current.parent.content.splice(n,1);
    }

}

function DModel() {
    var root = new DNode('root');

    this.makeBlock = function() {
        return new DNode(exports.BLOCK);
    };
    this.makeText = function(text) {
        return new DNode(exports.TEXT,text);
    };
    this.makeSpan = function() {
        return new DNode(exports.SPAN);
    }
    this.append = function(node) {
        root.append(node);
    };

    this.countCharacters = function() {
        return countChars(root);
    };

    this.insertText = function(node, offset, text) {
        if(node.type == exports.TEXT) {
            node.text = node.text.substring(0,offset) + text + node.text.substring(offset);
        }
    };

    this.deleteText = function(startNode, startOffset, endNode, endOffset) {
        if(startNode === endNode && startNode.type === exports.TEXT) {
            if(startOffset > endOffset) throw new Error("start offset can't be greater than end offset");
            if(startNode.type !== exports.TEXT) throw new Error("can't delete from non text yet");
            startNode.text = startNode.text.substring(0,startOffset)
                + startNode.text.substring(endOffset);
            return;
        }


        //two different nodes
        //adjust the start node
        startNode.text = startNode.text.substring(0, startOffset);
        var it = this.getIterator(startNode);
        while(it.hasNext()){
            var node = it.next();
            //console.log("next node is",node.id);
            if(node == endNode) {
                //console.log("at the end. fix it", node.id);
                node.text = node.text.substring(endOffset);
                break;
            } else {
                //console.log("in the middle. delete it", node.id);
                if(node.type == exports.TEXT) {
                    //console.log("text to delete", node.id);
                    it.deleteNow();
                    continue;
                }
                if(node.type == exports.BLOCK || node.type == exports.SPAN) {
                    //console.log("it's a block or span. check the kids");
                    if(node.content.length > 0) {
                        //console.log("still has kids. don't delete");
                    } else {
                        //console.log("it doesn't have kids. we can nuke it");
                        it.deleteNow();
                    }
                }
            }
        }
    };

    this.toPlainText = function() {
        return flattenChars(root);
    };

    this.getRoot = function() { return root};


    this.getIterator = function(node) {
        return new DNodeIterator(node);
    }
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
