var EventEmitter = require('events').EventEmitter
var Dir = require('./dir')
var File = require('./file')

function DirOnlyWatcher(dirpath){
  if (!(this instanceof DirOnlyWatcher)){
    return new DirOnlyWatcher(dirpath)
  }
  var self = this
  this.dir = new Dir(dirpath, self)
  this.dir.update()
}

DirOnlyWatcher.prototype = {
  __proto__: EventEmitter.prototype,
  close: function(){
    this.dir.destroy()
  }
}

module.exports = DirOnlyWatcher


