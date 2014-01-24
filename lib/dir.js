var assert = require('assert')
var fs = require('fs')
var async = require('async')
var path = require('path')
var File = require('./file')
var debounce = require('lodash.debounce')
var minimatch = require('minimatch')
var is = require('is-type')
var hasOwnProperty = Object.prototype.hasOwnProperty

function Dir(dirpath, sink, wantDir){
  assert(is.string(dirpath))
  assert(sink)
  assert(is.function(sink.emit))
  assert(wantDir == null || is.function(wantDir))

  this.path = dirpath
  this.sink = sink
  this.wantDir = wantDir
  this.entries = {}
  this.watcher = null
  this.sink.emit('add', this.path)
  this.update = debounce(this._update.bind(this), 200)
}

Dir.prototype = {
  _isEntry: function(filename){
    return hasOwnProperty.call(this.entries, filename)
  },
  _update: function(doneUpdate){
    
    doneUpdate = doneUpdate || function(){}
    var self = this
    
    if (!this.watcher){
      this._watch()
    }

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
        if (self.wantDir && !self.wantDir(entryPath)){
          return next()
        }
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
            var dir = self.entries[entryName] = new Dir(
              entryPath, self.sink, self.skipDirEntryPatterns)
            dir.update(next)
          }else{
            if (!self._isEntry(entryName)){
              self.entries[entryName] = new File(
                entryPath, stat, self.sink)
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
  _watch: function(){
    var self = this
    try{
      this.watcher = fs.watch(this.path, function(evt, filename){
        if (evt === 'change' && self._isEntry(filename)){
          self.entries[filename].update()
        }else{
          self.update()
        }
      })
      this.watcher.on('error', function(err){
        if (err.code === 'EPERM') return
        self.sink.emit('error', err)
      })
    }catch(e){
      if (e.code === 'ENOENT'){
        this.destroy()
        return
      }else{
        throw new Error(e.message + ' - ' + self.code + ' - ' + self.path)
      }
    }
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
  },
  numWatchers: function(){
    var sum = this.watcher ? 1 : 0
    for (var entryName in this.entries){
      var entry = this.entries[entryName]
      sum += entry.numWatchers()
    }
    return sum
  }
}

module.exports = Dir
