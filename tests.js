var fireworm = require('./fireworm')
var expect = require('chai').expect
var exec = require('child_process').exec
var sinon = require('sinon')

describe('fireworm', function(){
    var w
    beforeEach(function(done){
        w = fireworm('a_dir')
        w.once('ready', done)
    })
    afterEach(function(){
        w.clear()
    })
    it('crawls', function(){
        expect(w.knownDirs()).to.deep.equal([
            'a_dir', 'a_dir/a_nested_dir'
        ])
        expect(w.knownFiles()).to.deep.equal([
            'a_dir/one.txt', 'a_dir/a_nested_dir/two.txt'
        ])
    })
    it('watches dirs', function(){
        expect(w.watchedDirs()).to.deep.equal([
            'a_dir', 'a_dir/a_nested_dir'
        ])
    })
    it('watches no files', function(){
        expect(w.watchedFiles()).to.deep.equal([])
    })
    context('watching a_dir/one.txt', function(){
        beforeEach(function(done){
            w.add('a_dir/one.txt')
            w.on('ready', done)
        })
        it('watches files when added', function(){
            expect(w.watchedFiles()).to.deep.equal(['a_dir/one.txt'])
        })
        it('fires change iff when you modify the file', function(done){
            this.timeout(3000)
            setTimeout(function(){
                exec('touch -m a_dir/one.txt')
                w.once('change', function(filename){
                    var changed = sinon.spy()
                    w.once('change', changed)
                    setTimeout(function(){
                        exec('touch -a a_dir/one.txt', function(){
                            setTimeout(function(){
                                expect(changed.called).to.not.be.ok
                                done()
                            }, 10)
                        })
                    }, 1000)
                })
            }, 1000)
        })
    })
    
})
