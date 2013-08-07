var EventEmitter = require('events').EventEmitter
var path = require('path')
var Glob = require('./glob')
var fs = require('fs')
var minimatch = require('minimatch')
var Set = require('set')

function Fireworm(){
  if (!(this instanceof Fireworm)) return new Fireworm
  this.globs = new Set
  this.dirs = new Set
  this.files = new Set
}

Fireworm.prototype = {
  __proto__: EventEmitter.prototype,
  add: function(glob){
    glob = new Glob(glob)
    this.globs.add(glob)
    var baseDir = glob.baseDir()
    if (baseDir in this.dirs){
      process.nextTick(function(){
        this.emit('ready')
      }.bind(this))
      return
    }else{
      var self = this
      this.dirs.add(baseDir)
      fs.readdir(baseDir, function(err, entries){
        entries.forEach(function(entry){
          var entrypath = path.join(baseDir, entry)
          if (minimatch(entrypath, glob.string)){
            self.files.add(entrypath)
          }
        })
        self.emit('ready')
      })
    }
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

