var fs = require('graceful-fs')
var path = require('path')
var async = require('async')
var EventEmitter = require('events').EventEmitter

function DirCrawler(dirpath){
  this.path = path.resolve(dirpath)
  this.stats = {}
  this.watchers = {}
}

DirCrawler.prototype = {
  __proto__: EventEmitter.prototype,
  crawl: function(callback){
    this.crawldir(this.path, callback)
  },
  crawldir: function(filepath, callback){
    var self = this
    fs.stat(filepath, function(err, stat){
      if (err){
        return callback(err)
      }
      self.stats[filepath] = stat
      self.watchers[filepath] = 
        fs.watch(filepath, function(evt){
          self.onFileWatchEvent(evt, filepath)
        })
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
  onFileWatchEvent: function(evt, filepath){
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
    this.stats = {}
  }
}

module.exports = DirCrawler