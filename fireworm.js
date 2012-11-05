var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter.prototype
var matchesStart = require('./matches_start')
var minimatch = require('minimatch')
var Set = require('set')

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
    this.patterns = new Set
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

FW.crawl = function(thing, depth, options){
    var self = this
    options = options || {}
    if (options.maxDepth && depth > options.maxDepth) return
    this.pushTask()
    fs.stat(thing, function(err, stat){
        if (err){
            self.popTask()
            return
        }
        if (stat.isDirectory()){
            var dir = thing
            self.dirs[dir] = stat
            if (self.needToWatchDir(dir)){
                self.watchDir(dir)
                fs.readdir(dir, function(err, files){
                    if (err) return
                    files.forEach(function(file){
                        self.crawl(path.join(dir, file), depth + 1, options)
                    })
                    self.popTask()
                })
            }else{
                self.popTask()
            }
        }else if (stat.isFile()){
            var file = thing
            if (options.notifyNewFiles && self.needToWatchFile(file) &&
                 !self.files[file]){
                self.emit('change', file)
            }
            self.files[file] = stat
            if (self.needToWatchFile(file)){
                if (!self._watchedFiles[file]){
                    self._watchedFiles[file] = fs.watch(file, function(){
                        self.onFileAccessed(file)
                    })
                }    
            }
            self.popTask()
        }
    })
}

FW.needToWatchDir = function(dir){
    dir = path.resolve(dir)
    return this.patterns.get().reduce(function(curr, pattern){
        pattern = path.resolve(pattern)
        return curr || matchesStart(dir, pattern)
    }, false)
}

FW.needToWatchFile = function(file){
    file = path.resolve(file)
    return this.patterns.get().reduce(function(curr, pattern){
        pattern = path.resolve(pattern)
        return curr || minimatch(file, pattern)
    }, false)
}

FW.add = function(pattern){
    var self = this
    this.patterns.add(pattern)
    this.pushTask()
    process.nextTick(function(){
        self.crawl('.', 0)
        self.popTask()   
    })
}

FW.clear = function(){
    for (var file in this.files){
        var watcher = this._watchedFiles[file]
        if (watcher) watcher.close()
    }
    this._watchedFiles = {}
}

FW.ifFileOutOfDate = function(filename, callback){
    var self = this
    var oldStat = this.files[filename]
    fs.stat(filename, function(err, stat){
        if (err){
            if (oldStat) callback()
                delete self.files[filename]
        }else{
            var then = oldStat.mtime.getTime()
            var now = stat.mtime.getTime()
            if (then < now){
                callback()
                self.files[filename] = stat
            }
        }
    })
}

FW.onFileAccessed = function(filename){
    var self = this
    this.ifFileOutOfDate(filename, function(){
        self.emit('change', filename)  
    })
}

FW.onDirAccessed = function(dir){
    console.log('onDirAccessed ' + dir)
    var self = this
    process.nextTick(function(){
        self.crawl(dir, 0, {notifyNewFiles: true})
    })
}

FW.watchDir = function(dir){
    var self = this
    if (!this._watchedDirs[dir]){
        this._watchedDirs[dir] = fs.watch(dir, function(){
            self.onDirAccessed(dir)
        })
    }
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

function fireworm(){
    var worm = makeNew(FW)
    return worm
}

module.exports = fireworm