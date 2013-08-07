var DirCrawler = require('./dircrawler')
var assert = require('chai').assert
var exec = require('child_process').exec
var spy = require('ispy')
var path = require('path')

suite.only('dir crawler', function(){

  var c

  teardown(function(){
    c.clear()
  })

  test('crawls', function(done){
    c = new DirCrawler('./')
    c.crawl(function(){
      assert(c.getStat('a_dir/one.txt'))
      done()
    })
  })

  test('watches for file changes', function(done){
    c = new DirCrawler('./')
    c.crawl(function(){
      var changed = spy()
      c.once('change', changed)
      exec('touch -m a_dir/one.txt')
      changed.on('call', function(evt, filepath){
        assert.equal(evt, 'change')
        assert.equal(filepath, abs('a_dir/one.txt'))
        done()
      })
    })
  })

  test('watches for dir changes', function(done){
    c = new DirCrawler('./')
    c.crawl(function(){
      var changed = spy()
      c.once('change', changed)
      exec('touch -m a_dir/two.txt')
      changed.on('call', function(evt, filepath){
        assert.equal(evt, 'rename')
        assert.equal(filepath, abs('a_dir'))
        exec('rm a_dir/two.txt', function(){
          done()
        })
      })
    })
  })

})

function abs(pth){
  return path.resolve(pth)
}