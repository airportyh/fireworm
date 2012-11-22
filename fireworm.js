var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter.prototype
var matchesStart = require('./matches_start')
var minimatch = require('minimatch')
var Set = require('set')

module.exports = fireworm
function fireworm(){

    var fw = Object.create(EventEmitter)

    fw.taskCount = 0
    fw.dirs = {}
    fw.files = {}
    fw.inoStats = {}
    fw._watchedDirs = {}
    fw._watchedFiles = {}
    fw.patterns = new Set

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
        console.log('cleanUpIno ' + ino)
        delete fw.inoStats[ino]
        if (fw._watchedFiles[ino]){
            fw._watchedFiles[ino].watcher.close()
            delete fw._watchedFiles[ino]
        }
        if (fw._watchedDirs[ino]){
            fw._watchedDirs[ino].watcher.close()
            delete fw._watchedDirs[ino]
        }
    }

    fw.crawl = function(thing, depth, options){
        options = options || {}
        if (options.maxDepth && depth > options.maxDepth) return
        fw.pushTask()
        fs.stat(thing, function(err, stat){
            if (err){
                fw.popTask()
                return
            }
            if (stat.isDirectory()){
                var dir = thing
                if (fw.dirs[dir] && fw.dirs[dir] !== stat.ino){
                    fw.cleanUpIno(fw.dirs[dir])
                }
                fw.dirs[dir] = stat.ino
                fw.inoStats[stat.ino] = stat
                if (fw.needToWatchDir(dir)){
                    fw.watchDir(dir, stat.ino)
                    fs.readdir(dir, function(err, files){
                        if (err) return
                        files.forEach(function(file){
                            fw.crawl(path.join(dir, file), depth + 1, options)
                        })
                        fw.popTask()
                    })
                }else{
                    fw.popTask()
                }
            }else if (stat.isFile()){
                var file = thing
                console.log('stat ' + file)
                if (options.notifyNewFiles && fw.needToWatchFile(file) &&
                     !fw.files[file]){
                    fw.emit('change', file)
                }
                if (fw.files[file] && fw.files[file] !== stat.ino){
                    fw.cleanUpIno(fw.files[file])
                }
                fw.files[file] = stat.ino
                fw.inoStats[stat.ino] = stat
                if (fw.needToWatchFile(file)){
                    fw.watchFile(file, stat.ino)    
                }
                fw.popTask()
            }
        })
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

    fw.clear = function(){
        for (var file in fw.files){
            var watcher = fw._watchedFiles[file]
            if (watcher) watcher.close()
        }
        fw._watchedFiles = {}
    }

    fw.ifFileOutOfDate = function(filename, callback){
        var oldStat = fw.inoStats[fw.files[filename]]
        fs.stat(filename, function(err, stat){
            if (err){
                if (oldStat) callback()
                    delete fw.files[filename]
            }else{
                var then = oldStat.mtime.getTime()
                var now = stat.mtime.getTime()
                if (then < now){
                    callback()
                    fw.files[filename] = stat.ino
                    fw.inoStats[stat.ino] = stat
                }
            }
        })
    }

    fw.onFileAccessed = function(evt, filename){
        console.log('onFileAccesed ' + evt + ' ' + filename)
        if (evt === 'rename'){
            // it has been deleted, so re-crawl parent directory
            fw.crawl(path.dirname(filename), 0)
        }
        fw.ifFileOutOfDate(filename, function(){
            fw.emit('change', filename)  
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
        return Object.keys(fw.dirs)
    }

    fw.knownFiles = function(){
        return Object.keys(fw.files)
    }

    return fw
}
