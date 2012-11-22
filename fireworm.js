var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter.prototype
var matchesStart = require('./matches_start')
var minimatch = require('minimatch')
var Set = require('set')


function statcache(){
    var s = {}
    s.stats = {}
    s.inos = {}
    s.save = function(path, stat){
        s.inos[path] = stat.ino
        s.stats[stat.ino] = stat
    }
    s.remove = function(path){
        var ino = s.inos[path]
        delete s.stats[ino]
        delete s.inos[path]
    }
    s.get = function(path){
        return s.stats[s.inos[path]]
    }
    s.knownPaths = function(){
        return Object.keys(s.inos)
    }
    return s
}

module.exports = fireworm
function fireworm(){

    var fw = Object.create(EventEmitter)

    function init(){
        fw.taskCount = 0
        fw.dirs = statcache()
        fw.files = statcache()
        fw._watchedDirs = {}
        fw._watchedFiles = {}
        fw.patterns = new Set
    }

    init()

    fw.pushTask = function(){
        fw.taskCount++
    }

    fw.popTask = function(){
        fw.taskCount--
        if (fw.taskCount === 0){
            process.nextTick(function(){
                fw.emit('ready')
            })
        }
    }

    fw.printInfo = function(){
        console.log('_watchedDirs')
        console.log(fw._watchedDirs)
        console.log('_watchedFiles')
        console.log(fw._watchedFiles)
        console.log('dirs')
        console.log(fw.dirs)
        console.log('files')
        console.log(fw.files)
    }

    fw.cleanUpIno = function(ino){
        if (fw._watchedFiles[ino]){
            fw._watchedFiles[ino].watcher.close()
            delete fw._watchedFiles[ino]
        }
        if (fw._watchedDirs[ino]){
            fw._watchedDirs[ino].watcher.close()
            delete fw._watchedDirs[ino]
        }
    }

    fw.clear = function(){
        for (var file in fw._watchedFiles){
            fw._watchedFiles[file].watcher.close()
            delete fw._watchedFiles[file]
        }
        for (var dir in fw._watchedDirs){
            fw._watchedDirs[dir].watcher.close()
            delete fw._watchedDirs[dir]
        }
        init()
    }

    fw.crawl = function(thing, depth, options){
        options = options || {}
        if (options.maxDepth && depth > options.maxDepth) return
        if (!fw.needToWatchDir(thing)) return
        fw.pushTask()
        fs.stat(thing, function(err, stat){
            if (err){
                fw.popTask()
                return
            }
            if (stat.isDirectory()){
                fw.crawlDir(thing, stat, depth, options, function(){
                    fw.popTask()
                })
            }else if (stat.isFile()){
                fw.crawlFile(thing, stat, options)
                fw.popTask()
            }
        })
    }

    fw.crawlDir = function(dir, stat, depth, options, callback){
        var ino = fw.dirs.get(dir)
        if (ino !== stat.ino){
            fw.dirs.remove(dir)
        }
        fw.watchDir(dir, stat.ino)
        fw.dirs.save(dir, stat)
        fs.readdir(dir, function(err, files){
            if (err) return
            files.forEach(function(file){
                fw.crawl(path.join(dir, file), depth + 1, options)
            })
            if (callback) callback()
        })
    }

    fw.crawlFile = function(file, stat, options){
        fw.watchFile(file, stat.ino)    
        var isNewFile = !fw.files.get(file)
        if (options.notifyNewFiles && isNewFile){
            fw.emit('change', file)
        }
        fw.files.save(file, stat)
    }

    fw.needToWatchDir = function(dir){
        dir = path.resolve(dir)
        return fw.patterns.get().reduce(function(curr, pattern){
            pattern = path.resolve(pattern)
            return curr || matchesStart(dir, pattern)
        }, false)
    }

    fw.needToWatchFile = function(file){
        file = path.resolve(file)
        return fw.patterns.get().reduce(function(curr, pattern){
            pattern = path.resolve(pattern)
            return curr || minimatch(file, pattern)
        }, false)
    }

    fw.add = function(){
        for (var i = 0; i < arguments.length; i++){
            fw.patterns.add(arguments[i])
        }
        fw.pushTask()
        process.nextTick(function(){
            fw.crawl('.', 0)
            fw.popTask()
        })
    }

    fw.ifFileOutOfDate = function(filename, callback){
        var oldStat = fw.files.get(filename)
        fs.stat(filename, function(err, stat){
            if (err){
                if (oldStat) fw.cleanUpIno(oldStat.ino)
                fw.files.remove(filename)
                if (oldStat) callback(true)
            }else{
                var then = oldStat.mtime.getTime()
                var now = stat.mtime.getTime()
                if (then < now){
                    fw.files.save(filename, stat)
                    callback(true)
                }else{
                    callback(false)
                }
            }
        })
    }

    fw.onFileAccessed = function(evt, filename){
        fw.ifFileOutOfDate(filename, function(yes){
            if (evt === 'rename'){
                // it has been deleted, so re-crawl parent directory
                fw.crawl(path.dirname(filename), 0)
            }
            if (yes){
                fw.emit('change', filename)  
            }
        })
    }

    fw.onDirAccessed = function(evt, dir){
        process.nextTick(function(){
            fw.crawl(dir, 0, {notifyNewFiles: true})
        })
    }

    fw.watchDir = function(dir, ino){
        if (!fw._watchedDirs[ino]){
            fw._watchedDirs[ino] = {
                path: dir
                , watcher: fs.watch(dir, function(evt){
                    fw.onDirAccessed(evt, dir)
                })
            }
        }
    }

    fw.watchFile = function(file, ino){
        if (!fw._watchedFiles[ino]){
            fw._watchedFiles[ino] = {
                path: file
                , watcher: fs.watch(file, function(evt){
                    fw.onFileAccessed(evt, file)
                })
            }
        }
    }

    fw.watchedDirs = function(){
        var dirs = []
        for (var ino in fw._watchedDirs){
            dirs.push(fw._watchedDirs[ino].path)
        }
        return dirs
    }

    fw.watchedFiles = function(){
        var files = []
        for (var ino in fw._watchedFiles){
            files.push(fw._watchedFiles[ino].path)
        }
        return files
    }

    fw.knownDirs = function(){
        return fw.dirs.knownPaths()
    }

    fw.knownFiles = function(){
        return fw.files.knownPaths()
    }

    return fw
}
