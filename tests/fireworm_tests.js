var Fireworm = require('../index')
var Dir = require('../lib/dir')
var bd = require('bodydouble')
var spy = require('ispy')
var assert = require('insist')
var is = require('is-type')

suite('fireworm', function(){

  test('initializes', function(){
    var fw = Fireworm('a_dir')
  })

  test('wantDir', function(){
    var fw = Fireworm('a_dir')
    fw.add('a_dir/*.txt')
    fw.add('a_dir/foo/*.txt')
    assert(!fw.wantDir('a_dir/node_module')) // node_module is skipped by default
    assert(!fw.wantDir('a_dir/.git'))        // .git is skipped by default
    assert(fw.wantDir('a_dir'))
    assert(fw.wantDir('a_dir/foo'))
    assert(!fw.wantDir('a_dir/bar'))
  })

  ;['add', 'change', 'remove'].forEach(function(evt){

    test('if dir fires `' + evt + '` and pattern matches, it fires', function(){
      var fw = Fireworm('a_dir')
      fw.add('foo')
      var onEvt = spy()
      fw.on(evt, onEvt)
      fw.dir.sink.emit(evt, 'foo')
      assert(onEvt.called)
    })

    test('`' + evt + '` if no pattern matches, no fire', function(){
      var fw = Fireworm('a_dir')
      fw.add('foo')
      var onEvt = spy()
      fw.on(evt, onEvt)
      fw.dir.sink.emit(evt, 'bar')
      assert(!onEvt.called)
    })

    test('`' + evt + '` if matches ignore pattern, no fire', function(){
      var fw = Fireworm('a_dir')
      fw.add('*')
      fw.ignore('foo')
      var onEvt = spy()
      fw.on(evt, onEvt)
      fw.dir.sink.emit(evt, 'foo')
      assert(!onEvt.called)
    })

  })

  test('ignoreInitial option', function(){
    var fw = Fireworm('a_dir', {ignoreInitial: true})
    fw.add('*')
    var onAdd = spy()
    fw.on('add', onAdd)
    fw.dir.sink.emit('add', 'foo')
    assert(!onAdd.called)
    fw.dir.updateCallback()
    fw.dir.sink.emit('add', 'foo')
    assert(onAdd.called)
  })

  test('add and clear', function(){
    var fw = Fireworm('a_dir')
    fw.add('*')
    assert.deepEqual(fw.patterns, ['*'])
    fw.add('foo')
    assert.deepEqual(fw.patterns, ['*', 'foo'])
    fw.add(['bar'])
    assert.deepEqual(fw.patterns, ['*', 'foo', 'bar'])
    fw.ignore('foo')
    assert.deepEqual(fw.ignores, ['foo'])
    fw.clear()
    assert.deepEqual(fw.patterns, [])
    assert.deepEqual(fw.ignores, [])
  })

  before(function(){
    Fireworm.prototype.Dir = FakeDir
  })

  function FakeDir(dirpath, sink, wantDir){
    assert(is.string(dirpath))
    assert(sink)
    assert(is.function(sink.emit))
    assert(wantDir == null || is.function(wantDir))
    this.dirpath = dirpath
    this.sink = sink
    this.wantDir = wantDir
  }

  FakeDir.prototype = {
    update: function(cb){
      this.updateCallback = cb
    }
  }

})