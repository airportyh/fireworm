var Fireworm = require('../index')
var Dir = require('../lib/dir')
var bd = require('bodydouble')
var spy = require('ispy')
var assert = require('insist')

suite('fireworm', function(){

  test('initializes', function(){
    var fw = Fireworm('a_dir')
  })

  test('default skipDirEntryPatterns', function(){
    var fw = Fireworm('a_dir')
    assert.deepEqual(fw.dir.skipDirEntryPatterns,
      ['node_modules', '.*'])
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

  function FakeDir(dirpath, sink, skipDirEntryPatterns){
    this.dirpath = dirpath
    this.sink = sink
    this.skipDirEntryPatterns = skipDirEntryPatterns
  }

  FakeDir.prototype = {
    update: function(cb){
      this.updateCallback = cb
    }
  }

})