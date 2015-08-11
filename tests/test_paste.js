/**
 * Created by josh on 8/11/15.
 */
var test = require('tape');
var Model = require('../src/model');
var Dom   = require('../src/dom');
var VirtualDoc = require('./virtualdom');
var Editor = require('../src/editor');
var Keystrokes = require('../src/keystrokes');




test('basic text diff 1',function(t) {
    var diff = Keystrokes.calculateTextDifference('abcdef','abcXdef');
    t.equal(diff.same,false);
    t.equal(diff.newChar,'X');
    t.equal(diff.offset,3);

    var diff = Keystrokes.calculateTextDifference('abcdef','Xabcdef');
    t.equal(diff.same,false);
    t.equal(diff.newChar,'X');
    t.equal(diff.offset,0);


    var diff = Keystrokes.calculateTextDifference('abcdef','abcdefX');
    t.equal(diff.same,false);
    t.equal(diff.newChar,'X');
    t.equal(diff.offset,6);
    t.end();

    var diff = Keystrokes.calculateTextDifference('abcdef','abcdef');
    t.equal(diff.same,true);

});

test('text diff 2', function(t) {
    var diff = Keystrokes.calculateTextDifference("foo ","foo_s");
    console.log("diff is",diff);


    t.equal(diff.same,false);
    t.equal(diff.newString,'_s');
    t.equal(diff.offset,3);
    t.end();
})