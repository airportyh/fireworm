var path = require('path')

function Glob(string){
  this.string = path.resolve(string)
}
Glob.prototype = {
  baseDir: function(){
    var dir = this.string
      .replace(/^(.+?)(\\)?[*?].*$/, 
        function($0, $1, $2){
          return $2 ? $0 : $1
        })
      .replace(/^(.+?)(\\)?\[.+?(\\)?\].*$/,
        function($0, $1, $2, $3){
          return !$2 && !$3 ? $1 : $0
        })
      .replace('\\', '')
    var idx = dir.lastIndexOf('/')
    return dir.substring(0, idx)
  },
  valueOf: function(){
    return this.string
  }
}

module.exports = Glob