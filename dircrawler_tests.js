var DirCrawler = require('./dircrawler')
var assert = require('chai').assert
var child_process = require('child_process')
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

  test('file accessed doesnt fire', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){
      access('a_dir/one.txt', function(){
        assertNotCalledSoon(changed, done)
      })    
    })
  })

  test('file modified', function(done){
    this.timeout(3000)
    c.add('a_dir/one.txt')
    c.crawl(function(){
      setTimeout(function(){
        touch('a_dir/one.txt')
        changed.once('call', function(filepath){
          assert.equal(filepath, abs('a_dir/one.txt'))
          done()
        })
      }, 1000)
    })
  })

  test('file also modified but ', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      touch('a_dir/one.txt', function(){
        assertNotCalledSoon(changed, done)
      })
    })
  })

  test('file created that we care about', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      touch('a_dir/two.txt')
    })
    changed.on('call', function(filepath){
      assert.equal(filepath, abs('a_dir/two.txt'))
      done()
    })
  })

  test('watches a new file that we care about', function(done){
    this.timeout(3000)
    c.add('a_dir/two.txt')
    c.removeAllListeners()
    c.on('change', changed)
    c.crawl(function(){
      touch('a_dir/two.txt')
      var callCount = 0
      changed.on('call', function(filepath){
        callCount++
        assert.equal(filepath, abs('a_dir/two.txt'))
        if (callCount === 1){
          setTimeout(function(){
            touch('a_dir/two.txt')
          }, 1000)
        }else if (callCount === 2){
          done()
        }
      })
    })
  })

  test('file gets renamed to something we want', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      exec('mv a_dir/one.txt a_dir/two.txt')
      changed.on('call', function(filepath){
        assert.equal(filepath, abs('a_dir/two.txt'))
        done()
      })
    })
  })

  test('file gets renamed to something we dont want', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      exec('mv a_dir/one.txt a_dir/three.txt', function(){
        assertNotCalledSoon(changed, done)
      })
    })
  })

  test('file gets renamed from something we want to something we dont', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){  
      exec('mv a_dir/one.txt a_dir/three.txt')
      changed.on('call', function(filepath){
        assert.equal(filepath, abs('a_dir/one.txt'))
        done()
      })
    })
  })

  test('file we care about gets removed', function(done){
    c.add('a_dir/one.txt')
    c.crawl(function(){
      exec('rm a_dir/one.txt')
      changed.on('call', function(filepath){
        assert.equal(filepath, abs('a_dir/one.txt'))
        done()
      })
    })
  })

  test('file we dont care about gets removed', function(done){
    c.add('a_dir/two.txt')
    c.crawl(function(){
      exec('rm a_dir/one.txt', function(){
        assertNotCalledSoon(changed, done)
      })
    })
  })

  test('directory created which we care about', function(done){
    c.add('a_dir/another_dir')
    c.crawl(function(){
      exec('mkdir a_dir/another_dir')
      changed.on('call', function(){
        done()
      })
    })
  })

  test('watches new directory contents', function(done){
    c.add('a_dir/another_dir/*.js')
    c.removeAllListeners()
    c.crawl(function(){
      exec('mkdir a_dir/another_dir', function(){
        setTimeout(function(){
          exec('touch a_dir/another_dir/hello.js')
        }, 200)
      })
    })
    c.on('change', function(filepath){
      assert.equal(filepath, abs('a_dir/another_dir/hello.js'))
      if (filepath === abs('a_dir/another_dir/hello.js')){
        done()
      }
    })
  })

  test('watches files in a directory then dir got moved', function(done){
    c.add('a_dir/another_dir/*.js')
    c.removeAllListeners()
    c.crawl(function(){
      exec('mkdir a_dir/another_dir', function(){
        setTimeout(function(){
          exec('touch a_dir/another_dir/hello.js', function(){
            setTimeout(function(){
              exec('mv a_dir/another_dir /tmp/another_dir_' + randomSlug())
            }, 200)
          })
        }, 200)
      })
    })
    var callCount = 0
    c.on('change', function(filepath){ 
      callCount++
      assert.equal(filepath, abs('a_dir/another_dir/hello.js'))
      if (callCount === 2) done()
    })
  })

})

function randomSlug(){
  return Math.floor(Math.random() * 10000000)
}

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

function exec(command, callback){
  child_process.exec(command, function(){
    var args = arguments
    if (callback) callback.apply(null, args)
  })
}

function touch(filepath, callback){
  filepath = path.normalize(filepath)
  exec('touch ' + filepath, callback)
}

function assertNotCalledSoon(spy, done){
  setTimeout(function(){
    assert(!spy.called, 'should not have called')
    done()
  }, 300)
}

function assertCalled(spy){
  assert(spy.called, 'should have called')
}