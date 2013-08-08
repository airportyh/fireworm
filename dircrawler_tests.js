var DirCrawler = require('./dircrawler')
var assert = require('chai').assert
var exec = require('child_process').exec
var spy = require('ispy')
var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

suite('dir crawler', function(){

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
    c.add('a_dir/one.txt')
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

  test.only('file modified but we dont care', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      touch('a_dir/one.txt', function(){
        assertNotCalled(changed)
        //done()
      })
    })
    changed.on('call', function(evt, filepath){
      console.error(evt, filepath)
      done(new Error('should not have called'))
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
      exec('mv a_dir/one.txt a_dir/two.txt', function(){
        
      })
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

  test.skip('file gets renamed from something we want to something we dont', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){
      exec('mv a_dir/one.txt a_dir/three.txt', function(){
        assertCalled(changed)
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
  rimraf('a_dir', function(){
    mkdirp('a_dir', function(){
      touch('a_dir/one.txt', callback)
    })
  })
}

function touch(filepath, callback){
  filepath = path.normalize(filepath)
  fs.open(filepath, 'w', callback)
}

function assertNotCalled(spy){
  assert(!spy.called, 'should not have called')
}

function assertCalled(spy){
  assert(spy.called, 'should have called')
}