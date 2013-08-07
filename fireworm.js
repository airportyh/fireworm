var EventEmitter = require('events').EventEmitter
var path = require('path')
var Glob = require('./glob')
var fs = require('fs')
var minimatch = require('minimatch')

function Fireworm(){
  if (!(this instanceof Fireworm)) return new Fireworm
  this.dirs = {}
  this.files = {}
}

Fireworm.prototype = {
  __proto__: EventEmitter.prototype,
  add: function(glob){
    glob = new Glob(glob)
    var baseDir = glob.baseDir()
    if (baseDir in this.dirs){
      process.nextTick(function(){
        this.emit('ready')
      }.bind(this))
      return
    }else{
      var self = this
      this.dirs[baseDir] = true
      fs.readdir(baseDir, function(err, entries){
        entries.forEach(function(entry){
          var entrypath = path.join(baseDir, entry)
          if (minimatch(entrypath, glob.string)){
            self.files[entrypath] = true
          }
        })
        self.emit('ready')
      })
    }
  },  
  watchedDirs: function(){
    return Object.keys(this.dirs)
  },
  watchedFiles: function(){
    return Object.keys(this.files)
  },
  clear: function(){}
}

module.exports = Fireworm

