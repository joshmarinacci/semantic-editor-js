/**
 * Created by josh on 8/21/15.
 */

var Model      = require('../src/model');
var VirtualDom = require('./virtualdom');
var Dom        = require('../src/dom');
var Editor     = require('../src/editor');
var test       = require('tape');

test('syncing dom',function(t){
    var dom_root = VirtualDom.createElement('div');
    var editor = Editor.makeEditor(dom_root);
    var model  = editor.getModel();
    var blk = model.makeBlock();
    var span1 = model.makeSpan();
    span1.meta = { foo:'bar'}
    var txt1 = model.makeText('abc');
    span1.append(txt1);
    blk.append(span1);
    model.getRoot().append(blk);
    //Model.print(model);

    t.equals(model.getRoot().child(0).child(0).meta.foo,'bar');

    Dom.rebuildDomFromModel(model.getRoot(), dom_root, dom_root, dom_root.ownerDocument, editor.getMapping());
    //Dom.print(dom_root);

    var mod2 = Dom.rebuildModelFromDom(dom_root, model, editor.getImportMapping());
    //Model.print(mod2);

    t.equals(mod2.child(0).child(0).meta.foo,'bar');


    t.end();
});