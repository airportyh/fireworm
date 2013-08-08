var DirCrawler = require('./dircrawler')
var assert = require('chai').assert
var exec = require('child_process').exec
var spy = require('ispy')
var path = require('path')
var fs = require('fs')

suite.only('dir crawler', function(){

  var c, changed

  setup(function(done){
    createFixture(done)
    c = new DirCrawler('a_dir')
    changed = spy()
    c.once('change', changed)
  })

  teardown(function(){
    c.clear()
  })

  test('gets stats', function(done){
    c = new DirCrawler('a_dir')
    c.crawl(function(){
      assert(c.getStat('a_dir/one.txt'))
      done()
    })
  })

  test('file modified', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){
      touch('a_dir/one.txt')
      changed.on('call', function(evt, filepath){
        done()
      })
    })
  })

  test('file modified but we dont care', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      touch('a_dir/one.txt', function(){
        assertNotCalled(changed)
        done()
      })
    })
  })

  test('file created that we care about', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      touch('a_dir/two.txt')
    })
    changed.on('call', function(evt, filepath){
      done()
    })
  })

  test('file gets renamed to something we want', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      exec('mv a_dir/one.txt a_dir/two.txt')
    })
    changed.on('call', function(evt, filepath){
      done()
    })
  })

  test('file gets renamed to something we dont want', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      exec('mv a_dir/one.txt a_dir/three.txt', function(){
        assertNotCalled(changed)
        done()
      })
    })
  })

})

function abs(filepath){
  filepath = path.normalize(filepath)
  return path.resolve(filepath)
}

function createFixture(callback){
  exec('rm -fr a_dir; mkdir a_dir; touch a_dir/one.txt', function(){
    callback()
  })
}

function touch(filepath, callback){
  filepath = path.normalize(filepath)
  fs.open(filepath, 'w', callback)
}

function assertNotCalled(spy){
  assert(!spy.called, 'should not have called')
}