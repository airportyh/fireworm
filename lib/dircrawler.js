var fs = require('fs')
var path = require('path')
var async = require('async')
var EventEmitter = require('events').EventEmitter
var minimatch = require('minimatch')
var matchesStart = require('./matches_start')
var throttle = require('./throttle')

function DirCrawler(dirpath){
  if (!(this instanceof DirCrawler)){
    return new DirCrawler(dirpath)
  }
  this.path = path.resolve(path.normalize(dirpath))
  this.crawling = false
  this.statTimers = {}
  this.stats = {}
  this.watchers = {}
  this.globs = {}
  this.throttledEmit = throttle(this.emit, 200)
}

DirCrawler.prototype = {
  __proto__: EventEmitter.prototype,
  crawl: function(callback){
    callback = callback || function(){}
    var self = this
    this.crawling = true
    var start = new Date().getTime()
    this.crawldir(this.path, {}, function(err){
      var end = new Date().getTime()
      self.crawling = false
      callback(err)
    })
  },
  crawldir: function(filepath, visitedInos, callback){
    callback = callback || function(){}
    var self = this
    this.statAndWatch(filepath, function(err, stat){
      //console.error('stat', filepath, err, stat)
      if (err){
        return callback(null)
      }
      if (visitedInos[stat.ino]){
        return callback(null)
      }
      visitedInos[stat.ino] = true
      if (stat.isDirectory()){
        fs.readdir(filepath, function(err, entries){
          entries = entries.filter(self.wantEntry)
          async.each(entries, function(entry, next){
            self.crawldir(path.join(filepath, entry), visitedInos, next)
          }, callback)
        })
      }else{
        callback(null)
      }
    })
  },
  statAndWatch: function(filepath, callback){
    var self = this
    fs.stat(filepath, function(err, stat){
      var prevStat = self.stats[filepath]
      if (err){
        self.untrack(filepath)
        return callback(err, null, prevStat)
      }
      self.stats[filepath] = stat
      if (!self.watchers[filepath]){
        if (stat.isDirectory() && self.wantDirectory(filepath)){
          self.watchDir(filepath)
        }else if (stat.isFile() && self.wantFile(filepath)){
          if (!prevStat && !self.crawling){
            self.throttledEmit('change', filepath)
          }
          self.watchFile(filepath) 
          
        }
      }
      callback(null, stat, prevStat)
    })
  },
  wantFile: function(filepath){
    var self = this
    var ret = this.getGlobs().some(function(glob){
      return minimatch(filepath, glob) && 
        !self.isIgnored(filepath)
    })
    return ret
  },
  isIgnored: function(filepath){
    var ret = this.getIgnores().some(function(glob){
      return minimatch(filepath, glob)
    })
    return ret
  },
  getIgnores: function(){
    return Object.keys(this.ignore)
  },
  add: function(filepath){
    filepath = path.resolve(path.normalize(filepath))
    this.globs[filepath] = true
  },
  ignore: function(filepath){
    filepath = path.resolve(path.normalize(filepath))
    this.ignore[filepath] = true
  },
  onFileAccessed: function(evt, filename, filepath){
    if (this.crawling) return
    //console.error('onFileAccessed', evt, filename, filepath)
    if (this.wantFile(filepath)){
      this.fireChangedIfModified(filepath)
    }
  },
  onDirAccessed: function(evt, filename, dirpath){
    if (this.crawling) return
    //console.error('onDirAccessed', evt, filename, dirpath)
    var self = this
    if (filename){
      var filepath = path.join(dirpath, filename)
      if (this.wantFile(filepath)){
        this.fireChangedIfModified(filepath)
      }else if (this.wantDirectory(filepath)){
        var self = this
        //console.error(filepath, 'checking modified')
        this.ifFileModified(filepath, function(err, stat, prevStat){
          if (!stat && prevStat){
            self.fireOrphansChanged(filepath)
          }
          self.crawldir(filepath, {})
        })
      }
    }
  },
  fireOrphansChanged: function(filepath, prevStat){
    var self = this
    Object.keys(self.stats).filter(function(fp){
      if (fp.substring(0, filepath.length) === filepath){
        if (self.wantFile(fp)){
          self.throttledEmit('change', fp)
        }
        self.untrack(fp)
      }
    })
  },
  fireChangedIfModified: function(filepath){
    var self = this
    this.ifFileModified(filepath, function(){
      self.throttledEmit('change', filepath)
    })
  },
  ifFileModified: function(filepath, callback){
    var self = this
    this.statAndWatch(filepath, function(err, stat, lastStat){
      if (err){
        if (lastStat) return callback(err, stat, lastStat)
        return
      }
      if (!lastStat){
        return callback(err, stat, lastStat)
      }
      //console.error('before', lastStat.mtime.getTime(),
      //  'after', stat.mtime.getTime())`
      if (lastStat.mtime.getTime() < stat.mtime.getTime()){
        return callback(err, stat, lastStat)
      }
    })
  },
  getStat: function(filepath){
    return this.stats[path.resolve(filepath)]
  },
  wantEntry: function(entry){
    if (entry.charAt(0) === '.') return false
    if (entry === 'node_modules') return false
    return true
  },
  wantDirectory: function(dirpath){
    return this.getGlobs().some(function(glob){
      return matchesStart(dirpath, glob)
    })
  },
  watchFile: function(filepath){
    //console.error('watching file', filepath)
    var self = this
    var w = this.watchers[filepath] = 
      fs.watch(filepath, function(evt, filename){
        self.onFileAccessed(evt, filename, filepath)
      })
    w.on('error', function(){
      w.close()
    })
  },
  watchDir: function(dirpath){
    //console.error('watching dir', dirpath)
    var self = this
    var w = this.watchers[dirpath] = 
      fs.watch(dirpath, function(evt, filename){
        self.onDirAccessed(evt, filename, dirpath)
      })
    w.on('error', function(){
      w.close()
    })
  },
  untrack: function(filepath){
    delete this.stats[filepath]
    var watcher = this.watchers[filepath]
    if (watcher) watcher.close() 
  },
  clear: function(){
    for (var filepath in this.watchers){
      var watcher = this.watchers[filepath]
      watcher.close()
    }
    this.crawling = false
    this.statTimers = {}
    this.stats = {}
    this.watchers = {}
    this.globs = {}
  },
  getGlobs: function(){
    return Object.keys(this.globs)
  }
}

module.exports = DirCrawler