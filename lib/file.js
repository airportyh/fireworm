var assert = require('assert')
var fs = require('fs')
var debounce = require('lodash.debounce')

function File(filepath, stat, sink){
  this.path = filepath
  this.stat = stat
  this.sink = sink
  this.sink.emit('add', this.path)
  this.update = debounce(this._update.bind(this), 200, {
    leading: true,
    trailing: false
  })
}

File.prototype = {
  _update: function(){
    var self = this
    var prevStat = this.stat
    fs.stat(this.path, function(err, stat){
      self.stat = stat
      if (err){
        if (err.code === 'ENOENT'){
          // file no longer exists
          // but ignore because parent node will
          // take care of clean up
        }else{
          // unexpected error, emit as an event
          self.sink.emit('error', err)
        }
        return
      }
      assert(prevStat != null, 'File should always be initialied with stat')
      if (stat.mtime.getTime() > prevStat.mtime.getTime()){
        self.sink.emit('change', self.path)
      }else{
        // remained the same
      }
    })
  },
  isDirectory: function(){
    return false
  },
  destroy: function(){
    this.sink.emit('remove', this.path)
  }
}

module.exports = File