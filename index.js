var DirCrawler = require('./lib/dircrawler')
var EventEmitter = require('events').EventEmitter
var minimatch = require('minimatch')
var flatten = require('lodash.flatten')

function Fireworm(dir){
  if (!(this instanceof Fireworm)){
    return new Fireworm(dir)
  }
  var onChange = this._onChange.bind(this)
  this.patterns = []
  this.ignores = []
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
    var args = flatten(arguments)
    for (var i = 0; i < args.length; i++){
      this.patterns.push(args[i])
    }
  },
  ignore: function(){
    var args = flatten(arguments)
    for (var i = 0; i < args.length; i++){
      this.ignores.push(args[i])
    }
  },
  clear: function(){
    this.patterns = []
    this.ignores = []
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
    return this.patterns.some(function(pattern){
      return minimatch(filepath, pattern)
    }) && !this.ignores.some(function(pattern){
      return minimatch(filepath, pattern)
    })
  }
}

module.exports = Fireworm
