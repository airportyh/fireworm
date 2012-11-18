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
    this.inoStats = {}
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

FW.printInfo = function(){
    console.log('_watchedDirs')
    console.log(this._watchedDirs)
    console.log('_watchedFiles')
    console.log(this._watchedFiles)
    console.log('dirs')
    console.log(this.dirs)
    console.log('files')
    console.log(this.files)
}

FW.cleanUpIno = function(ino){
    delete this.inoStats[ino]
    if (this._watchedFiles[ino]){
        this._watchedFiles[ino].watcher.close()
        delete this._watchedFiles[ino]
    }
    if (this._watchedDirs[ino]){
        this._watchedDirs[ino].watcher.close()
        delete this._watchedDirs[ino]
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
            if (self.dirs[dir] !== stat.ino){
                self.cleanUpIno(self.dirs[dir])
            }
            self.dirs[dir] = stat.ino
            self.inoStats[stat.ino] = stat
            if (self.needToWatchDir(dir)){
                self.watchDir(dir, stat.ino)
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
            if (self.files[file] !== stat.ino){
                self.cleanUpIno(self.files[file])
            }
            self.files[file] = stat.ino
            self.inoStats[stat.ino] = stat
            if (self.needToWatchFile(file)){
                self.watchFile(file, stat.ino)    
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
    var oldStat = this.inoStats[this.files[filename]]
    fs.stat(filename, function(err, stat){
        if (err){
            if (oldStat) callback()
                delete self.files[filename]
        }else{
            var then = oldStat.mtime.getTime()
            var now = stat.mtime.getTime()
            if (then < now){
                callback()
                self.files[filename] = stat.ino
                self.inoStats[stat.ino] = stat
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

FW.onDirAccessed = function(evt, dir){
    var self = this
    process.nextTick(function(){
        self.crawl(dir, 0, {notifyNewFiles: true})
    })
}

FW.watchDir = function(dir, ino){
    var self = this
    if (!this._watchedDirs[ino]){
        this._watchedDirs[ino] = {
            path: dir
            , watcher: fs.watch(dir, function(evt){
                self.onDirAccessed(evt, dir)
            })
        }
    }
}

FW.watchFile = function(file, ino){
    var self = this
    if (!this._watchedFiles[ino]){
        this._watchedFiles[ino] = {
            path: file
            , watcher: fs.watch(file, function(){
                self.onFileAccessed(file)
            })
        }
    }
}

FW.watchedDirs = function(){
    var dirs = []
    for (var ino in this._watchedDirs){
        dirs.push(this._watchedDirs[ino].path)
    }
    return dirs
}

FW.watchedFiles = function(){
    var files = []
    for (var ino in this._watchedFiles){
        files.push(this._watchedFiles[ino].path)
    }
    return files
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