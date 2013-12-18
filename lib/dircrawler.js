var EventEmitter = require('events').EventEmitter
var Dir = require('./dir')
var File = require('./file')

function DirOnlyWatcher(dirpath, options){
  if (!(this instanceof DirOnlyWatcher)){
    return new DirOnlyWatcher(dirpath, options)
  }
  var self = this
  this.dir = new Dir(dirpath, self, options || {})
  this.dir.update()
}

DirOnlyWatcher.prototype = {
  __proto__: EventEmitter.prototype,
  close: function(){
    this.dir.destroy()
  }
}

module.exports = DirOnlyWatcher


