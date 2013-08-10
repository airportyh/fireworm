var DirCrawler = require('./dircrawler')
var assert = require('chai').assert
var exec = require('child_process').exec
var spy = require('ispy')
var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

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
    c.add('a_dir/one.txt')
    c.crawl(function(){
      assert(c.getStat('a_dir/one.txt'))
      done()
    })
  })

  test('file accessed doesnt fire', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){
      setTimeout(function(){
        access('a_dir/one.txt', function(){
          setTimeout(function(){
            assertNotCalled(changed)
            done()
          }, 200)
        })
      }, 400)
    })
  })

  test('file modified', function(done){
    this.timeout(3000)
    c.add('a_dir/one.txt')
    c.crawl(function(){
      setTimeout(function(){
        touch('a_dir/one.txt')
        changed.once('call', function(evt, filepath){
          done()
        })
      }, 800)
    })
  })

  test('file also modified but ', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      touch('a_dir/one.txt', function(){
        setTimeout(function(){
          assertNotCalled(changed)
          done()
        }, 200)  
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

  test('file gets renamed from something we want to something we dont', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){
      setTimeout(function(){
        exec('mv a_dir/one.txt a_dir/three.txt', function(){
          setTimeout(function(){
            assertCalled(changed)
            done()
          }, 200)
        })
      }, 400)
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

function access(filepath, callback){
  filepath = path.normalize(filepath)
  exec('touch -a ' + filepath, callback)
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