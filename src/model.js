/**
 * Created by josh on 7/8/15.
 */

exports.TEXT = 'text';
exports.SPAN = 'span';
exports.BLOCK = 'block';
var DEFAULT_BLOCK_STYLE = 'body';

var _id_count = 0;
exports.genId = function() {
    _id_count++;
    return "id_"+_id_count;
}


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
        if(node.type == exports.TEXT) {
            node.text = node.text.substring(0,offset) + text + node.text.substring(offset);
        }
    };

    this.getPreviousTextNode = function(tnode) {
        if(typeof tnode.parent == 'undefined' || tnode.parent == null) throw new Error("invalid node with no parent");


        function getIndex(n) {
            return n.parent.content.indexOf(n);
        }
        var n = getIndex(tnode);
        if(n == 0) {
            console.log("first child. must go up");
            return this.getPreviousTextNode(tnode.getParent());
        }

        n--;
        //get previous sibling
        tnode = tnode.getParent().child(n);
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
            //strip out empty nodes
            while(true) {
                if(pos.node.isEmpty()) {
                    var parent = pos.node.deleteFromParent();
                    pos.node = parent;
                } else {
                    break;
                }
            }
            //if both text and both have same parent (so it's not inside a span), then we can merge
            if(startNode.type == exports.TEXT && pos.node.type == exports.TEXT && startNode.getParent() == pos.node.getParent()) {
                startNode.text += pos.node.text;
                //delete the text node
                var parent = pos.node.deleteFromParent();
                //delete the parent if it's empty too
                if(parent.childCount() == 0) {
                    parent.deleteFromParent();
                }
            }
            return {
                node: startNode,
                offset: startOffset
            }
        }
    };

    this.deleteText = function(startNode, startOffset, endNode, endOffset) {
        //console.log("deleting from ",startNode.id,startOffset,"to",endNode.id,endOffset);
        if(startNode === endNode && startNode.type === exports.TEXT) {
            if(startOffset > endOffset) throw new Error("start offset can't be greater than end offset");
            if(startNode.type !== exports.TEXT) throw new Error("can't delete from non text yet");
            startNode.text = startNode.text.substring(0,startOffset)
                + startNode.text.substring(endOffset);
            return;
        }

        if(endNode.type !== exports.TEXT) {
            console.log("can't delete an element directly. go to it's text child");
            return this.deleteText(startNode,startOffset,endNode.child(0),endOffset);
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
                if(node.type == exports.BLOCK) {
                    console.log("it's a block. ");
                    if(node.content.length == 0) {
                        console.log("it's an empty block");
                    }
                }
                if(node.type == exports.TEXT) {
                    node.text = node.text.substring(endOffset);
                    console.log("new text length = ", node.text.length);
                    if(node.text.length <= 0) {
                        var parent = node.getParent();
                        it.deleteNow();
                        if(parent.content.length <= 0 && parent.getParent() != null) {
                            console.log("parent is empty too");
                            var nn= parent.getParent().content.indexOf(parent);
                            parent.parent.content.splice(nn,1);
                        }
                    }
                }
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
    };

    this.setBlockStyle = function(node, styleName) {
        node.style = styleName;
    };

    this.setStyles = function(styles) {
        this.styles = styles;
    }
    this.getStyles = function() {
        return this.styles;
    }


    this.findNodeById = function(id) {
        var it = this.getIterator(this.getRoot());
        while(it.hasNext()) {
            var node = it.next();
            if(node.id == id) return node;
        }
        return null;
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

//replaces the first node in it's parent with the rest of the nodes
function swapNode() {
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
}

exports.swapNode = swapNode;

//splits a text node in half at the requested offset
function splitModelNode(n,mod,model) {
    if(mod.type != exports.TEXT) {
        console.log("ERROR: don't know how to split non text node yet");
        return;
    }
    var a = model.makeText(mod.text.substring(0,n));
    var b = model.makeText(mod.text.substring(n));
    swapNode(mod,a,b);
    return [a,b];
}

exports.findModelForDom = function(root,target) {
    for(var i=0; i<root.content.length; i++) {
        var node = root.content[i];
        if(node.id == target.id) {
            return node;
        }
        if(node.type == exports.BLOCK || node.type == exports.SPAN) {
            var ans = exports.findModelForDom(node,target);
            if(ans != null) return ans;
        }
    }
    return null;
}


exports.wrapTextInInlineStyle = function(node,style,model) {
    var inline = model.makeSpan();
    inline.style = style;
    swapNode(node,inline);
    inline.append(node);
}

exports.splitThree = function(node,index1,index2,model) {
    var parts1 = splitModelNode(index1,node,model);
    var parts2 = splitModelNode(index2-index1,parts1[1],model);
    return [parts1[0],parts2[0],parts2[1]];
}
exports.splitTwo = function(node, index, model) {
    var parts = splitModelNode(index, node, model);
    return parts;
}

function dupeAndSplit(node,offset,model) {
    if(node.type == exports.TEXT) {
        var a = model.makeText(node.text.substring(0,offset));
        var b = model.makeText(node.text.substring(offset));
        var parent = node.getParent();
        var index = parent.content.indexOf(node);
        var before = parent.content.slice(0,index);
        var after  = parent.content.slice(index+1);
        var parents = dupeAndSplit(parent,-1,model);
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
        var a = model.makeBlock();
        var b = model.makeBlock();
        a.style = node.style;
        b.style = node.style;
        swapNode(node,a,b);
        return [a,b];
    }
}

exports.splitBlockAt = function(node, offset, model) {
    return dupeAndSplit(node,offset,model);
}


