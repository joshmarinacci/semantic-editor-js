#semantic editor


Description of the datastructure and operations

Since content-editable is so unreliable, we use a separate
data model which is then synced to the DOM.  Whenever the model changes
the DOM is fully regenerated from it.  Changing the style of a block
or span happens this way.  For simple adding and deleting of characters we let
the DOM side handle it, then do a reverse sync. This reverse sync figures out
what has changed between the DOM and model, producing a series of changes. Then
these changes are applied to the model and the DOM is re-rendered from the model.

This system means the model is authoritative. We may not be able to handle
every possible change that content editable supports in the DOM, but the model
will always be in a known valid state. This ensures reliablity above all else.

To modify the document you must use the following operations:

updateFormat(  startNode:Node, startOffset:Number, endNode:Node, endOffset:Number, style:String)

This will update the part of the selected node to the new style. If the length
of text to be changed is longer than the node, then it will continue into adjacent
nodes.  If the style is a block style then it will replace the existing style of
the current block instead of adding to it.  If updating the style requires splitting
parts of the node out into new nodes, then it will do it.

```
insertText(node:Node, offset:Number, string:String)
```

inserts the string at the offset in the node.  Generally this does not require creating
new nodes.  The new text will inherit the current style since it is part of the same node.

```
deleteText(startNode:Node, startOffset:Number, endNode:Node, endOffset:Number)
```
removes the requested number of characters at the offset in the node. If this spills to adjacent
nodes then other nodes will be adjusted or deleted as needed.
startOffset is the first character to be deleted. it is an inclusive index.
end offset is the first cahracter that won't be deleted. it is an exclusive index.
endOffset-startOffset (if in the same node) will be the number of characters deleted 


created nodes from scratch is generally done only when loading a document from disk. This is done
with the make() and append() functions. the following example will create a new document

```
var model = doc.makeModel();
var block = model.makeBlock();
model.getRoot().append(block);
block.append(model.makeText("This is some));
var span = model.makeSpan();
span.append(model.makeText("bold"));
span.addStyle('bold');
block.append(span);
block.append(model.makeText("text."));
```

note that the root element is special. it always exists and cannot be changed or deleted. You will always 
add blocks to the root, not change the root itself.

nodes are tracked using automatically generated unique IDs.

to find a node by id, call

```
model.findById(id:String)
```

To implement a command like bold the current selection, call:

var sel = dom.getSelection();
if(!sel.collapsed) {
    model.updateFormat(sel.startNode, sel.startOffset, sel.endNode, sel.endOffset, 'bold');
}

The model knows nothing about the DOM. To work with the dom use the Editor class to build your model.
This will attach the proper listeners to handle all of the syncing work. ex:

var editor = Editor.makeEditor(document.getElementById("myeditor"));
var model = editor.getModel();
var block = model.makeBlock();
... etc

### unit tests

to ensure model correctness we need tons of unit tests.

make block
make span
append span to block
append text, span, text to block
split block->text  in two and style the second half
split block->text  in three and style the middle part
delete across blocks
insert text in the middle of a span
insert text at the end of a span
change teh style of a block
change the style of a span
change the style of a span and the text next to it, to a different style
change the style of a span and the text next to it to the same style


