var EventEmitter = require('events').EventEmitter
var minimatch = require('minimatch')
var flatten = require('lodash.flatten')
var Dir = require('./lib/dir')

function Fireworm(dirpath, options){

  if (!(this instanceof Fireworm)){
    return new Fireworm(dirpath, options)
  }

  options = options || {}
  
  this.patterns = []
  this.ignores = []

  if (options.ignoreInitial){
    this.suppressEvents = true
  }

  var sink = new EventEmitter

  this.dir = new this.Dir(dirpath, sink, {
    skipDirEntryPatterns: 
    options.skipDirEntryPatterns || ['node_modules', '.*']
  })

  sink
    .on('add', this._onAdd.bind(this))
    .on('change', this._onChange.bind(this))
    .on('remove', this._onRemove.bind(this))
    .on('error', this._onError.bind(this))

  this.dir.update(function(){
    this.suppressEvents = false
  }.bind(this))
  
}

Fireworm.prototype = {
  __proto__: EventEmitter.prototype,
  Dir: Dir, // to allow injection in tests
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
  _onAdd: function(filepath){
    if (this.suppressEvents) return
    if (this._matches(filepath)){
      this.emit('add', filepath)
    }
  },
  _onRemove: function(filepath){
    if (this.suppressEvents) return
    if (this._matches(filepath)){
      this.emit('remove', filepath)
    }
  },
  _onChange: function(filepath){
    if (this.suppressEvents) return
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
