var assert = require('assert')
var fs = require('fs')
var async = require('async')
var path = require('path')
var File = require('./file')

function Dir(dirpath, sink, options){
  // var stat = fs.statSync(dirpath)
  // assert(stat.isDirectory(), 'A Dir must be a directory.')
  this.path = dirpath
  this.options = options || {}
  this.entries = {}
  this.watcher = null
  this.sink = sink
  if (!this.options.dontFireInitial){
    this.sink.emit('add', this.path)
  }
}

Dir.prototype = {
  update: function(doneUpdate){
    doneUpdate = doneUpdate || function(){}

    var self = this
    this.watcher = this.watcher || 
      fs.watch(this.path, function(){
        self.update()
      })
    this.watcher.on('error', function(err){
        if (err.code === 'EPERM') return
        self.sink.emit('error', err)
    })
    for (var entryName in this.entries){
      var entry = this.entries[entryName]
      if (entry.isDirectory()){
        // do nothing for existing directories
      }else{
        entry.update()
      }
    }
    fs.readdir(this.path, function(err, entryNames){
      if (err){
        if (err.code === 'ENOENT'){
          // ignore, this means the directory has been
          // removed, but the parent node should
          // handle the destroy
        }else{
          // unexpected error, emit as event
          self.sink.emit('error', err)
        }
        return
      }

      // detect added entries
      var newEntries = entryNames.filter(function(entryName){
        return !self.entries[entryName]
      })

      async.each(newEntries, function(entryName, next){
        var entryPath = path.join(self.path, entryName)
        fs.stat(entryPath, function(err, stat){
          if (err){
            if (err.code === 'ENOENT'){
              // ignore - it was a fleeting file?
            }else{
              self.sink.emit('error', err)
            }
            return
          }
          
          if (stat.isDirectory()){
            var dir = self.entries[entryName] = new Dir(entryPath, self.sink, self.options)
            dir.update(next)
          }else{
            if (!(entryName in self.entries)){
              self.entries[entryName] = new File(entryPath, stat, self.sink, self.options)
            }
            next(null)
          }
        })
      }, function(){

        // detect removed entries
        for (var entryName in self.entries){
          if (entryNames.indexOf(entryName) === -1){
            // entry was removed
            var entry = self.entries[entryName]
            entry.destroy()
            delete self.entries[entryName]
          }
        }

        doneUpdate()

      })

    })
  },
  isDirectory: function(){
    return true
  },
  destroy: function(){
    if (this.watcher){
      this.watcher.close()
    }
    for (var entryName in this.entries){
      var entry = this.entries[entryName]
      entry.destroy()
    }
    this.sink.emit('remove', this.path)
  }
}

module.exports = Dir
