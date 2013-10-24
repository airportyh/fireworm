var DirCrawler = require('./lib/dircrawler')
var EventEmitter = require('events').EventEmitter

function Fireworm(baseDir){
  if (!(this instanceof Fireworm)){
    return new Fireworm(baseDir)
  }
  this.dirCrawler = new DirCrawler(baseDir)
  this.dirCrawler.on('change', this.onChange.bind(this))
  this.needRecrawl = false
  process.nextTick(function(){
    this.start()
  }.bind(this))
}

Fireworm.prototype = {
  __proto__: EventEmitter.prototype,
  add: function(){
    var globsBefore = this.dirCrawler.getGlobs()
    for (var i = 0; i < arguments.length; i++){
      this.dirCrawler.add(arguments[i])
    }
    var globsAfter = this.dirCrawler.getGlobs()
    if (globsAfter.length > globsBefore.length){
      this.needRecrawl = true
    }
  },
  ignore: function(){
    for (var i = 0; i < arguments.length; i++){
      this.dirCrawler.ignore(arguments[i])
    }
  },
  start: function(){
    var self = this
    function check(){
      if (self.needRecrawl){
        self.needRecrawl = false
        self.dirCrawler.crawl(function(){
          setTimeout(check, 1000)  
        })
      }else{
        setTimeout(check, 1000)
      }
    }
    check()
  },
  clear: function(){
    this.dirCrawler.clear()
    this.needRecrawl = false
  },
  onChange: function(filepath){
    this.emit('change', filepath)
  }  
}

module.exports = Fireworm
