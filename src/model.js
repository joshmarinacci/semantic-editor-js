/**
 * Created by josh on 7/8/15.
 */

exports.ROOT = 'root';
exports.TEXT = 'text';
exports.SPAN = 'span';
exports.BLOCK = 'block';

var _id_count = 0;
exports.genId = function() {
    _id_count++;
    return "id_"+_id_count;
}


function DNode(type,text) {
    this.type = type;
    this.id = exports.genId();
    this.style = 'body';
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
    this.childCount = function() {
        if(this.content) return this.content.length;
        return 0;
    };
    this.getParent = function() { return this.parent; };
    this.deleteFromParent = function() {
        var n = this.parent.content.indexOf(this);
        this.parent.content.splice(n,1);
        return this.parent;
    };
    this.findBlockParent = function() {
        if(this.type == exports.BLOCK) return this;
        return this.parent.findBlockParent();
    };
    this.isEmpty = function() {
        if(this.type == exports.TEXT && this.text.length == 0) return true;
        if(this.type == exports.SPAN && this.content.length == 0) return true;
        if(this.type == exports.BLOCK && this.content.length == 0) return true;
        return false;
    }
}


function countChars(par) {
    var total = 0;
    if(par.content) {
        par.content.forEach(function(n){
            total += countChars(n);
        })
    }
    if(par.type == exports.TEXT) return par.text.length;
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
    this.hasNext = function() { return nextNode !== null };
    this.next = function()    {
        current = nextNode;
        nextNode = calculateNextNode();
        return current;
    };

    function calculateNextNode() {
        //look at kids first
        if(current.childCount() > 0 && current.didKids === false) {
            current.didKids = true;
            var ch = current.child(0);
            ch.didKids = false;
            return ch;
        }

        //no kids. look at sibling next
        var sib = getNextSibling(current);
        if(sib != null) {
            sib.didKids = false;
            return sib;
        }

        if(current.parent == null) return null;
        var par = current.parent;
        par.didKids = true;
        return par;
    }

    this.deleteNow = function() {
        if(current.parent == null) throw new Error("can't delete a node without a parent");
        var n = getIndex(current);
        current.parent.content.splice(n,1);
    }

}

function mergeBlocksBackwards(start,end) {
    end.content.forEach(function(node) {
        start.append(node);
    });
    end.deleteFromParent();
}

//merge blocks if deleting across blocks
function mergeParentBlocksIfNeeded(nodeA, nodeB) {
    var startBlock = nodeA.findBlockParent();
    var endBlock   = nodeB.findBlockParent();
    if(startBlock.id != endBlock.id)  mergeBlocksBackwards(startBlock,endBlock);
}

function DModel() {
    var root = new DNode('root');
    this._root = root;
    this.styles = {
        block:{
            body:'body'
        },
        inline: {
            bold:'bold'
        }
    };

    this.makeBlock = function() {
        return new DNode(exports.BLOCK);
    };
    this.makeText = function(text) {
        return new DNode(exports.TEXT,text);
    };
    this.makeSpan = function() {
        return new DNode(exports.SPAN);
    };
    this.append = function(node) {
        root.append(node);
    };

    this.countCharacters = function() {
        return countChars(root);
    };

    this.insertText = function(node, offset, text) {
        if(node.type != exports.TEXT) throw new Error("this isn't a text node");
        node.text = node.text.substring(0,offset) + text + node.text.substring(offset);
    };

    this.getPreviousTextNode = function(tnode) {
        if(typeof tnode.parent == 'undefined' || tnode.parent == null) throw new Error("invalid node with no parent");


        var n = tnode.parent.content.indexOf(tnode);
        if(n == 0) {
            return this.getPreviousTextNode(tnode.getParent());
        }

        n--;
        //get previous sibling
        tnode = tnode.getParent().child(n);
        if(tnode.type == 'text') return tnode;
        //get last child
        tnode = tnode.child(tnode.childCount()-1);
        if(tnode.type == 'text') return tnode;
    };

    this.getNextTextNode = function(tnode) {
        if(typeof tnode.parent == 'undefined' || tnode.parent == null) throw new Error("invalid node with no parent");
        var it = this.getIterator(tnode);
        while(it.hasNext()) {
            var node = it.next();
            if(node.type == exports.TEXT) return node;
        }
        return null;
    };

    this.cleanForward = function(tnode) {
        var nextNode = this.getNextTextNode(tnode);
        if(nextNode == null) return;
        //delete empty nodes
        var node = nextNode;
        while(node.isEmpty()) {
            node = node.deleteFromParent();
        }
    };

    this.deleteTextBackwards = function(node,offset) {
        if(node.isEmpty()) {
            var prevText = this.getPreviousTextNode(node);
            while(node.isEmpty()) {
                node = node.deleteFromParent();
            }
            return this.deleteTextBackwards(prevText,prevText.text.length);
        }
        if(node.type != exports.TEXT) throw new Error("can't delete text from a non-text element");
        //deleting just within the current node
        if(offset-1 >= 0) {
            this.deleteText(node,offset-1,node,offset);
            this.cleanForward(node);
            return {
                node:node,
                offset:offset-1
            }
        }
        var prevText = this.getPreviousTextNode(node);
        var prevOffset = prevText.text.length;
        var pos = this.deleteTextBackwards(prevText,prevOffset);
        mergeParentBlocksIfNeeded(pos.node,node);
        return {
            node:pos.node,
            offset: pos.offset
        }
    };

    this.deleteTextForwards = function(startNode, startOffset) {
        if(startNode.type != exports.TEXT) throw new Error("can't delete text from non text element");
        if(startOffset < startNode.text.length) {
            this.deleteText(startNode,startOffset,startNode,startOffset+1);
            return {
                node: startNode,
                offset: startOffset
            }
        } else {
            var nextText = this.getNextTextNode(startNode);
            var nextOffset = startOffset-startNode.text.length;
            var pos =  this.deleteTextForwards(nextText,nextOffset);

            mergeParentBlocksIfNeeded(startNode, pos.node);

            //strip out empty nodes
            while(pos.node.isEmpty()) pos.node = pos.node.deleteFromParent();

            //merge adjacent text nodes
            if(startNode.type == exports.TEXT && pos.node.type == exports.TEXT && startNode.getParent() == pos.node.getParent()) {
                startNode.text += pos.node.text;
                //delete the text node
                var parent = pos.node.deleteFromParent();
                //delete the parent if it's empty too
                if(parent.isEmpty()) parent.deleteFromParent();
            }
            return {
                node: startNode,
                offset: startOffset
            }
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

        if(endNode.type !== exports.TEXT) {
            return this.deleteText(startNode,startOffset,endNode.child(0),endOffset);
        }

        //two different nodes
        //adjust the start node
        startNode.text = startNode.text.substring(0, startOffset);
        var it = this.getIterator(startNode);
        while(it.hasNext()){
            var node = it.next();
            if(node == endNode) {
                if(node.type == exports.TEXT) {
                    node.text = node.text.substring(endOffset);
                    //delete empty nodes
                    if(node.isEmpty()) node.deleteFromParent();
                }
                mergeParentBlocksIfNeeded(startNode,node);
                break;
            } else {
                if(node.type == exports.TEXT) {
                    node.deleteFromParent();
                    continue;
                }
                if(node.type == exports.BLOCK || node.type == exports.SPAN) {
                    if(node.isEmpty()) node.deleteFromParent();
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
    };

    this.setBlockStyle = function(node, styleName) {
        node.style = styleName;
    };

    this.setStyles = function(styles) {
        this.styles = styles;
    };

    this.getStyles = function() {
        return this.styles;
    };

    this.findNodeById = function(id) {
        var it = this.getIterator(this.getRoot());
        while(it.hasNext()) {
            var node = it.next();
            if(node.id == id) return node;
        }
        return null;
    };

    this.splitBlockAt = function(node,offset) {
        if(node.type == exports.TEXT) {
            var a = this.makeText(node.text.substring(0,offset));
            var b = this.makeText(node.text.substring(offset));
            var parent = node.getParent();
            var index = parent.content.indexOf(node);
            var before = parent.content.slice(0,index);
            var after  = parent.content.slice(index+1);
            var parents = this.splitBlockAt(parent,-1);
            before.forEach(function(n){
                parents[0].append(n);
            });
            parents[0].append(a);
            parents[1].append(b);
            after.forEach(function(n){
                parents[1].append(n);
            });
            return [a,b];
        }
        if(node.type == exports.BLOCK) {
            var a = this.makeBlock();
            var b = this.makeBlock();
            a.style = node.style;
            b.style = node.style;
            this.swapNode(node,a,b);
            return [a,b];
        }
    };

    //replaces the first node in it's parent with the rest of the nodes
    this.swapNode = function() {
        var args = Array.prototype.slice.call(arguments);
        var oldnode = args.shift();
        var rest = args;
        var parent = oldnode.parent;
        var index = parent.content.indexOf(oldnode);
        var cargs = [index,1].concat(rest);
        parent.content.splice.apply(parent.content,cargs);
        rest.forEach(function(node) {
            node.parent = parent;
        })
    };

    //splits a text node in half at the requested index
    this.splitNode = function(node,index) {
        if(node.type != exports.TEXT) throw new Error("ERROR: don't know how to split non text node yet");
        var a = this.makeText(node.text.substring(0,index));
        var b = this.makeText(node.text.substring(index));
        this.swapNode(node,a,b);
        return [a,b];
    }
}

exports.makeModel = function() {
    return new DModel();
};
