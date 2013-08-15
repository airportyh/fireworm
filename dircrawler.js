var fs = require('fs')
var path = require('path')
var async = require('async')
var EventEmitter = require('events').EventEmitter
var minimatch = require('minimatch')
var matchesStart = require('./matches_start')

function DirCrawler(dirpath){
  this.path = path.resolve(path.normalize(dirpath))
  this.crawling = false
  this.statTimers = {}
  this.stats = {}
  this.watchers = {}
  this.globs = {}
}

DirCrawler.prototype = {
  __proto__: EventEmitter.prototype,
  crawl: function(callback){
    var self = this
    this.crawling = true
    var start = new Date().getTime()
    this.crawldir(this.path, function(err){
      var end = new Date().getTime()
      self.crawling = false
      callback(err)
    })
  },
  throttledStat: function(filepath, callback){
    fs.stat(filepath, callback)
    /*
    return
    // throttled wrapper for fs.stat
    var tid
    var self = this
    if (tid = this.statTimers[filepath]){
      clearTimeout(tid)
    }
    this.statTimers[filepath] = setTimeout(function(){
      delete self.statTimers[filepath]  
      fs.stat(filepath, function(err, stat){
        callback(err, stat)
      })
    }, 200)
*/
  },
  crawldir: function(filepath, callback){
    var self = this
    this.statAndWatch(filepath, function(err, stat){
      if (err){
        var prevStat = self.stats[filepath]
        if (prevStat && prevStat.isDirectory()){
          Object.keys(self.stats).filter(function(fp){
            if (fp.substring(0, filepath.length) === filepath){
              if (self.wantFile(fp)){
                self.emit('change', fp)
              }
              delete self.stats[fp]
            }
          })
          delete self.stats[filepath]
        }
        return
      }
      if (stat.isDirectory()){
        fs.readdir(filepath, function(err, entries){
          entries = entries.filter(self.wantEntry)
          async.each(entries, function(entry, next){
            self.crawldir(path.join(filepath, entry), next)
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
        return callback(err, null, prevStat)
      }
      self.stats[filepath] = stat
      if (!self.watchers[filepath]){

        if (stat.isDirectory()){
          //console.error('watching', filepath)
          self.watchers[filepath] = 
            fs.watch(filepath, function(evt, filename){
              self.onDirAccessed(evt, filename, filepath)
            })
        }else if (stat.isFile() && self.wantFile(filepath)){
          //console.error('watching', filepath)
          self.watchers[filepath] = 
            fs.watch(filepath, function(evt, filename){
              self.onFileAccessed(evt, filename, filepath)
            })
        }
      }
      callback(null, stat, prevStat)
    })
  },
  wantFile: function(filepath){
    return Object.keys(this.globs).some(function(glob){
      return minimatch(filepath, glob)
    })
  },
  add: function(filepath){
    filepath = path.resolve(path.normalize(filepath))
    this.globs[filepath] = true
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
        this.ifFileModified(filepath, function(){
          //console.error(filepath, 'was modified')
          self.crawldir(filepath)
        })
      }
    }
  },
  fireChangedIfModified: function(filepath){
    var self = this
    this.ifFileModified(filepath, function(){
      self.emit('change', filepath)
    })
  },
  ifFileModified: function(filepath, callback){
    var self = this
    this.statAndWatch(filepath, function(err, stat, lastStat){
      if (err){
        if (lastStat) return callback()
        return
      }
      if (!lastStat){
        return callback()
      }
      if (lastStat.mtime.getTime() < stat.mtime.getTime()){
        return callback()
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
    return Object.keys(this.globs).some(function(glob){
      return matchesStart(dirpath, glob)
    })
  },
  clear: function(){
    for (var filepath in this.watchers){
      var watcher = this.watchers[filepath]
      watcher.close()
    }
    this.watchers = {}
    this.stats = {}
  }
}

module.exports = DirCrawler