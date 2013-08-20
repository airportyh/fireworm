var EventEmitter = require('events').EventEmitter
var path = require('path')
var Glob = require('./glob')
var fs = require('fs')
var minimatch = require('minimatch')
var Set = require('set')
var async = require('async')

function Fireworm(){
  if (!(this instanceof Fireworm)) return new Fireworm
  this.dirStats = {}
  this.globs = new Set
  this.dirs = new Set
  this.files = new Set
}

Fireworm.prototype = {
  __proto__: EventEmitter.prototype,
  add: function(){
    var self = this
    async.each(arguments, function(glob, next){
      self.addGlob(glob, next)
    }, function(){
      self.emit('ready')
    })
  },
  addGlob: function(glob, callback){
    glob = new Glob(glob)
    this.globs.add(glob)
    var baseDir = glob.baseDir()
    var dir = this.dirWatchers[baseDir]
    if (!dir){
      dir = new DirectoryWatcher(dir)
      this.dirWatchers[baseDir] = dir
      dir.crawl(callback)
    }
    dir.addGlob(glob)
  },
  crawlDir: function(dir, callback){
    var self = this
    fs.readdir(dir, function(err, entries){
      entries.forEach(function(entry){
        var entrypath = path.join(dir, entry)
        if (self.matchesGlobs(entrypath)){
          self.files.add(entrypath)
          var watcher = fs.watch(entrypath, function(){
            self.onFileChange(entrypath)
          })
        }
      })
      callback(null)
    })
  },
  matchesGlobs: function(filepath){
    return this.globs.get().some(function(glob){
      return minimatch(filepath, glob)
    })
  },
  onFileChange: function(filepath){
    this.emit('change', filepath)
  },
  watchedDirs: function(){
    return this.dirs.get()
  },
  watchedFiles: function(){
    return this.files.get()
  },
  watchedGlobs: function(){
    return this.globs.get()
  },
  clear: function(){}
}

module.exports = Fireworm

