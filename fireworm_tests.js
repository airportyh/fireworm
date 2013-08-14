var fireworm = require('./fireworm')
var assert = require('chai').assert
var exec = require('child_process').exec
var async = require('async')
var Set = require('set')
var path = require('path')
var spy = require('ispy')

suite.skip('fireworm', function(){
  var w
  setup(function(){
    w = fireworm()
  })
  teardown(function(){
    w.clear()
  })

  suite('watching a_dir/*.txt', function(){
    setup(function(done){
      w.add('a_dir/*.txt')
      w.once('ready', done)
    })
    test('watches dirs', function(){
      assert.deepEqual(w.watchedDirs(), [abs('a_dir')])
    })
    test('no dups', function(done){
      w.add('a_dir/*.txt')
      w.once('ready', function(){
        assert.deepEqual(w.watchedDirs(), [abs('a_dir')])
        done()
      })
    })
    test('watches files', function(){
      assert.deepEqual(w.watchedFiles(), [
        abs('a_dir/one.txt'), abs('a_dir/three.txt')
      ])
    })
    test('keeps track of globs', function(){
      assert.deepEqual(w.watchedGlobs(), [
        abs('a_dir/*.txt')
      ])
    })
  })
  suite('watching a_dir/one.txt', function(){
    setup(function(done){
      w.add('a_dir/one.txt')
      w.once('ready', done)
    })
    test('watches files when added', function(){
      assert.deepEqual(w.watchedFiles(), [abs('a_dir/one.txt')])
    })

    test('fires change iff when you modify the file', function(done){
      exec('touch -m a_dir/one.txt')
      w.once('change', function(filename){
        var changed = spy()
        w.once('change', changed)
        exec('touch -a a_dir/one.txt')
        changed.on('call', function(){
          done()
        })
      })
    })
  })
  test.skip('watches multiple files', function(done){
    w.add('a_dir/one.txt', 'a_dir/three.txt')
    w.once('ready', function(){
      console.error(w.watchedFiles())
      assert.deepEqual(w.watchedFiles(), 
        [abs('a_dir/one.txt'), abs('a_dir/three.txt')])
      done()
    })
  })
  suite('file watching', function(){
    function cleanUp(done){
      async.series([                      function(next)
      { exec('rm a_dir/four.txt',         function(){ next() }) } , function(next)
      { exec('rm -fr a_dir/another_dir',  function(){ next() }) } , function(next)
      { exec('rm -fr b_dir',              function(){ next() }) }
      ], done)
    }
    setup(cleanUp)
    teardown(cleanUp)
    test('fires change on file changed', function(done){
      w.add('a_dir/one.txt')
      w.once('ready', function(){
        exec('touch -m a_dir/one.txt')
        w.once('change', function(filename){
          assert.equal(filename, abs('a_dir/one.txt'))
          done()
        })
      })
    })

    test.skip('fires change on new file added', function(done){
      w.add('a_dir/*.txt')
      w.once('ready', function(){
        exec('touch -m a_dir/four.txt')
        w.once('change', function(filename){
          assert.equal(filename, 'a_dir/four.txt')
          done()
        })
      })
    })

  //    it('fires change on new file inside new dir', function(done){
  //        w.add('a_dir/another_dir/*.txt')
  //        w.once('ready', function(){
  //            exec('mkdir a_dir/another_dir', function(){
  //                exec('touch a_dir/another_dir/five.txt')
  //                w.once('change', function(filename){
  //                    expect(filename).to.equal('a_dir/another_dir/five.txt')
  //                    done()
  //                })
  //            })
  //        })
  //    })
  //})
  //it('watches files that are recreated', function(done){
  //    w.add('a_dir/one.txt')
  //    w.once('ready', function(){
  //        exec('touch -m a_dir/one.txt')
  //        w.once('change', function(filename){
  //            exec('rm a_dir/one.txt', function(){
  //                exec('touch -m a_dir/one.txt')
  //                w.once('change', function(filename){
  //                    expect(filename).to.equal('a_dir/one.txt')
  //                    expect(w.watchedFiles()).to.deep.equal(['a_dir/one.txt'])
  //                    done()
  //                })
  //            })
  //        })
  //    })
  //})
  //it('watches dirs that are recreated', function(done){
  //    exec('mkdir b_dir', function(){
  //        w.add('b_dir/one.txt')
  //        w.once('ready', function(){
  //            exec('touch -m b_dir/one.txt')
  //            w.once('change', function(filename){
  //                exec('rm -rf b_dir', function(){
  //                    exec('mkdir b_dir && touch -m b_dir/one.txt')
  //                    w.once('change', function(filename){
  //                        expect(filename).to.equal('b_dir/one.txt')
  //                        done()
  //                    })
  //                    
  //                })
//
  //            })
  //        })
  //    })
  })
  //describe('isTracked', function(){
  //    it('should be ok if already tracked', function(){
  //        w.trackedDirs = new Set(['.'])
  //        expect(w.isTracked('.')).to.be.ok
  //    })
  //    it('should not be ok if not tracked', function(){
  //        w.trackedDirs = new Set(['abc'])
  //        expect(w.isTracked('.')).not.to.be.ok
  //    })
  //    it('should be ok if subdir of a tracked dir', function(){
  //        w.trackedDirs = new Set(['abc'])
  //        expect(w.isTracked('abc/def')).to.be.ok
  //        expect(w.isTracked('abcd/def')).not.to.be.ok
  //    })
  //})
})

function abs(pth){
  return path.resolve(pth)
}
