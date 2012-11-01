var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter.prototype


/* Object Util Functions */

function augment(obj, properties){
    for (var key in properties){
        obj[key] = properties[key]
    }
}

function clone(obj){
    var retval = {}
    augment(retval, obj)
    return retval
}

function makeNew(obj){
    var retval = clone(obj)
    if (retval.initialize) retval.initialize()
    return retval
}

/* Begin Interesting Stuff */

var FW = clone(EventEmitter)

FW.initialize = function(){
    this.taskCount = 0
    this.dirs = {}
    this.files = {}
    this._watchedDirs = {}
    this._watchedFiles = {}
}

FW.pushTask = function(){
    this.taskCount++
}

FW.popTask = function(){
    var self = this
    this.taskCount--
    if (this.taskCount === 0){
        process.nextTick(function(){
            self.emit('ready')
        })
    }
}

FW.crawl = function(thing){
    var self = this
    this.pushTask()
    fs.stat(thing, function(err, stat){
        if (!err && stat.isDirectory()){
            self.dirs[thing] = stat
            self.watchDir(thing)
            fs.readdir(thing, function(err, files){
                if (err) return
                files.forEach(function(file){
                    self.crawl(path.join(thing, file))
                })
                self.popTask()
            })
        }else if (stat.isFile()){
            self.files[thing] = stat
            self.popTask()
        }
    })
}

FW.add = function(pattern){
    var self = this
    this.pushTask()
    for (var file in this.files){
        with({file: file}){
            if (file === pattern){
                this._watchedFiles[file] = fs.watch(file, function(){
                    self.onFileAccessed(file)
                })
            }
        }
    }
    this.popTask()
}

FW.clear = function(){
    for (var file in this.files){
        var watcher = this._watchedFiles[file]
        if (watcher) watcher.close()
    }
    this._watchedFiles = {}
}

FW.onFileAccessed = function(filename){
    var self = this
    var oldStat = this.files[filename]
    fs.stat(filename, function(err, stat){
        var then = oldStat.mtime.getTime()
        var now = stat.mtime.getTime()
        if (then < now){
            self.emit('change', filename)
            self.files[filename] = stat
        }
    })
    
}

FW.watchDir = function(dir){
    this._watchedDirs[dir] = true
}

FW.watchedDirs = function(){
    return Object.keys(this._watchedDirs)
}

FW.watchedFiles = function(){
    return Object.keys(this._watchedFiles)
}

FW.knownDirs = function(){
    return Object.keys(this.dirs)
}

FW.knownFiles = function(){
    return Object.keys(this.files)
}

function fireworm(basedir){
    var worm = makeNew(FW)
    worm.crawl(basedir)
    return worm
}

module.exports = fireworm