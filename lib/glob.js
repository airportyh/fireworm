var path = require('path')
var minimatch = require('minimatch')



function baseDirUnix(){
  var dir = this.string
    .replace(/^(.+?)(\\)?[*?].*$/, 
      function($0, $1, $2){
        return $2 ? $0 : $1
      })
  var idx = dir.lastIndexOf('/')
  return dir.substring(0, idx)
}

function baseDirWindows(){
  var dir = this.string
    .replace(/^(.+?)(\/)?[*?].*$/, 
      function($0, $1, $2){
        return $2 ? $0 : $1
      })
  var idx = dir.lastIndexOf('\\')
  dir = dir.substring(0, idx)
  return dir
}

function Glob(string){
  this.string = path.resolve(path.normalize(string))
}
Glob.prototype = {
  baseDir: process.platform === 'win32' ?
    baseDirWindows : baseDirUnix,
  toString: function(){
    return this.string
  }
}

module.exports = Glob