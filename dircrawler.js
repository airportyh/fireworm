var fs = require('fs')
var path = require('path')
var async = require('async')
var EventEmitter = require('events').EventEmitter
var minimatch = require('minimatch')

function DirCrawler(dirpath){
  this.path = path.resolve(dirpath)
  this.crawling = false
  this.stats = {}
  this.watchers = {}
  this.globs = {}
}

DirCrawler.prototype = {
  __proto__: EventEmitter.prototype,
  crawl: function(callback){
    var self = this
    this.crawling = true
    this.crawldir(this.path, function(err){
      setTimeout(function(){
        // needs ~200ms in order for the
        // watchers to get read it seems
        self.crawling = false
        callback(err)
      }, 200)
    })
  },
  crawldir: function(filepath, callback){
    var self = this
    fs.stat(filepath, function(err, stat){
      if (err){
        return callback(err)
      }
      self.stats[filepath] = stat
      if (!self.watchers[filepath]){
        if (!stat.isFile() || self.wantFile(filepath)){
          self.watchers[filepath] = 
            fs.watch(filepath, function(evt){
              self.onFileWatchEvent(evt, filepath)
            })
        }
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
  wantFile: function(filepath){
    return Object.keys(this.globs).some(function(glob){
      return minimatch(filepath, glob)
    })
  },
  add: function(filepath){
    this.globs[filepath] = true
  },
  onFileWatchEvent: function(evt, filepath){
    if (this.crawling) return
    this.emit('change', evt, filepath)
  },
  getStat: function(filepath){
    return this.stats[path.resolve(filepath)]
  },
  wantEntry: function(entry){
    return entry.charAt(0) !== '.' && 
      entry !== 'node_modules'
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