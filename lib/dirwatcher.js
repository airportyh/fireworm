var EventEmitter = require('events').EventEmitter
var Dir = require('./dir')
var File = require('./file')

function DirWatcher(dirpath, options){
  if (!(this instanceof DirWatcher)){
    return new DirWatcher(dirpath, options)
  }
  var self = this
  this.dir = new Dir(dirpath, self, false, options || {})
  this.dir.update(true)
}

DirWatcher.prototype = {
  __proto__: EventEmitter.prototype,
  close: function(){
    this.dir.destroy()
  }
}

module.exports = DirWatcher


