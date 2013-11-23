var DirCrawler = require('./lib/dircrawler')
var EventEmitter = require('events').EventEmitter
var minimatch = require('minimatch')

function Fireworm(dir){
  if (!(this instanceof Fireworm)){
    return new Fireworm(dir)
  }
  var onChange = this._onChange.bind(this)
  this.patterns = []
  this.watcher = new DirCrawler(dir)
  this.watcher
    .on('add', onChange)
    .on('change', onChange)
    .on('remove', onChange)
    .on('error', this._onError.bind(this))
}

Fireworm.prototype = {
  __proto__: EventEmitter.prototype,
  add: function(){
    for (var i = 0; i < arguments.length; i++){
      this._addOne(arguments[i])
    }
  },
  clear: function(){
    this.watcher.close()
  },
  _addOne: function(pattern){
    this.patterns.push(pattern)
  },
  _onChange: function(filepath){
    if (this._matches(filepath)){
      this.emit('change', filepath)
    }
  },
  _onError: function(err){
    this.emit('error', err)
  },
  _matches: function(filepath){
    return this.patterns.reduce(function(matched, pattern){
      return matched || minimatch(filepath, pattern)
    }, false)
  }
}

module.exports = Fireworm
