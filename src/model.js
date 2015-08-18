/**
 * Created by josh on 7/8/15.
 */

exports.ROOT = 'root';
exports.TEXT = 'text';
exports.SPAN = 'span';
exports.BLOCK = 'block';

function DNode(type,text,model) {
    this.type = type;
    this.model = model;
    this.id = model.genId();
    this.style = 'body';
    this.parent = null;

    if(type == 'block' || type == 'span' || type == 'root') {
        this.content = [];
        this.append = function(node) {
            if(node == this) {
                throw new Error("can't add myself to myself. that makes a loop");
            }
            if(this.parent == node) {
                throw new Error("can't add parent to myself. that makes a loop");
            }
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
    this.replaceInParent = function(node) {
        var n = this.parent.content.indexOf(this);
        this.parent.content.splice(n,1,node);
        node.parent = this.parent;
        this.parent = null;
    };
    this.clear = function(node) {
        this.content = [];
    };
    this.appendAll = function(arr) {
        var self = this;
        arr.forEach(function(ch) {
            self.append(ch);
        });
    };
    this.findBlockParent = function() {
        if(this.type == exports.BLOCK) return this;
        return this.parent.findBlockParent();
    };
    this.insertAfter = function(n1,n2) {
        this.content.splice(n1.getIndex()+1,0,n2);
        n2.parent = this;
    };
    this.isEmpty = function() {
        if(this.type == exports.TEXT && this.text.length == 0) return true;
        if(this.type == exports.SPAN && this.content.length == 0) return true;
        if(this.type == exports.BLOCK && this.content.length == 0) return true;
        return false;
    };
    this.getIndex = function() {
        return this.getParent().content.indexOf(this);
    };
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

    function getNextSibling(node) {
        if(typeof node.parent == 'undefined') return null;
        if(node.parent == null) return null;
        var n = node.getIndex();
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
        current.deleteFromParent();
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
    var _id_count = 0;
    this.genId = function() {
        _id_count++;
        return "id_"+_id_count;
    };

    var root = new DNode('root',null, this);
    this._root = root;
    this.styles = {
        block:{
            body:'body'
        },
        inline: {
            bold:'plain'
        }
    };

    this.makeBlock = function() {
        return new DNode(exports.BLOCK, null, this);
    };
    this.makeText = function(text) {
        return new DNode(exports.TEXT,text,this);
    };
    this.makeSpan = function() {
        return new DNode(exports.SPAN, null, this);
    };
    this.append = function(node) {
        root.append(node);
    };

    this.getPreviousTextNode = function(tnode) {
        if(tnode.type == exports.ROOT) {
            return null;
        }
        if(typeof tnode.parent == 'undefined' || tnode.parent == null) throw new Error("invalid node with no parent");

        var n = tnode.getIndex();
        if(n == 0) {
            return this.getPreviousTextNode(tnode.getParent());
        }

        n--;
        //get previous sibling
        tnode = tnode.getParent().child(n);
        //get last child
        while(tnode.type !== exports.TEXT) {
            tnode = tnode.child(tnode.childCount()-1);
        }
        return tnode;
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
    /*
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
    */

    /*
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
    */
    /*
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
    */

    this.toPlainText = function() {     return flattenChars(root);  };

    this.getRoot = function() { return root};

    this.getIterator = function(node) { return new DNodeIterator(node);    };

    this.setStyles = function(styles) {
        this.styles = styles;
    };

    this.getStyles = function() {
        return this.styles;
    };

    function findModelForId(model,id) {
        if(model.id == id) return model;
        if(model.getRoot) return findModelForId(model.getRoot(),id);
        if(model.type != exports.TEXT) {
            for(var i=0; i<model.content.length; i++) {
                var found = findModelForId(model.content[i],id);
                if(found != null) return found;
            }
        }
        return null;
    }

    this.findNodeById = function(id) {
        if(typeof id == 'undefined') return null;
        return findModelForId(this,id);
    };

    this.splitBlockAt = function(node,offset) {
        if(node.type == exports.TEXT) {
            var a = this.makeText(node.text.substring(0,offset));
            var b = this.makeText(node.text.substring(offset));
            var parent = node.getParent();
            var index  = node.getIndex();
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
        if(node.type == exports.SPAN) {
            var a = this.makeSpan();
            var b = this.makeSpan();
            a.style = node.style;
            b.style = node.style;
            var parent = node.getParent();
            var index  = node.getIndex();
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
            return [a,b];
        }
        console.log("WARNING can't split this node type",node.type);
    };

    this.toJSON = function() {
        return modelToData_helper(this.getRoot());
    }

}

function modelToData_helper(node) {
    if(node.type == 'block') {
        return {
            type:'block',
            style:node.style,
            content: node.content.map(modelToData_helper),
            meta: node.meta
        }
    }
    if(node.type == 'text') {
        return {
            type:'text',
            text:node.text
        }
    }
    if(node.type == 'span') {
        return {
            type:'span',
            style:node.style,
            content: node.content.map(modelToData_helper),
            meta: node.meta
        }
    }
    if(node.type == 'root') {
        return {
            type: 'root',
            content: node.content.map(modelToData_helper)
        }
    }
}


exports.makeModel = function() {
    return new DModel();
};

exports.fromJSON = function(data) {
    var model = exports.makeModel();
    dataToModel_helper([data],model.getRoot(),model);
    return model;
};

function dataToModel_helper(data,root,model) {
    if(!data) {
        console.log("WARNING. data is null!");
        return;
    }
    data.forEach(function(dnode) {
        if(!dnode.type) {
            console.log("WARNING. dnode has no type. skipping = ", dnode);
            return;
        }
        if(dnode.type == 'text') {
            var str = dnode.text.trim();
            if(str == "") return;
            return root.append(model.makeText(dnode.text));
        }
        if(dnode.type == 'root') return dataToModel_helper(dnode.content,root,model);
        var mnode = null;
        if(dnode.type == 'span') mnode = model.makeSpan();
        if(dnode.type == 'block') mnode = model.makeBlock();
        if(dnode.style) mnode.style = dnode.style;
        dataToModel_helper(dnode.content,mnode,model);
        if(dnode.meta) {
            mnode.meta = dnode.meta;
        }
        if(mnode == null) {
            console.log("WARNING. null node. can't add it");
            console.log("original node is",dnode);
            return;
        }
        root.append(mnode);
        if(mnode.type == 'block') {
            var tomove = [];
            mnode.content.forEach(function(ch) {
                if(ch.type == 'block') tomove.push(ch);
            });
            tomove.forEach(function(ch) {
                ch.deleteFromParent();
                root.append(ch);
            })
        }
    });
}

exports.print = function(model,tab) {
    if(!tab) tab = "";
    if(model == null) {
        console.log(tab + "null");
        return;
    }
    if(model.getRoot) return exports.print(model.getRoot(),"");
    if(model.type == exports.TEXT) {
        console.log(tab + model.type + "#"+model.id+ "." + model.style + " '" + model.text+"'");
        return;
    }
    console.log(tab + model.type + "#"+model.id+ "." + model.style);
    if(model.childCount() > 0) {
        model.content.forEach(function(node){
            exports.print(node,tab+"  ");
        })
    }
};

exports.modelToDocumentOffset = function(node,target) {
    if(node == target) return {found:true,offset:0};
    if(node.type == exports.TEXT) {
        return {found:false,offset:node.text.length};
    } else {
        var total = 0;
        var found = false;
        for(var i=0; i<node.content.length; i++) {
            var res = exports.modelToDocumentOffset(node.content[i],target);
            total += res.offset;
            if(res.found === true) {
                found = true;
                break;
            }
        }
        return {found:found, offset:total};
    }
};

exports.documentOffsetToModel = function(root, off) {
    if(root.type == exports.TEXT) {
        if(off <= root.text.length) {
            return {found:true, offset:off, node:root};
        }
        return {found:false, offset:off-root.text.length};
    } else {
        var toff = off;
        for(var i=0; i<root.content.length; i++) {
            var res = exports.documentOffsetToModel(root.content[i],toff);
            if(res.found===true) return res;
            toff = res.offset;
        }
        return {found:false, offset: toff};
    }
};
