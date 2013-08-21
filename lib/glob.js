var path = require('path')
var minimatch = require('minimatch')



function baseDirUnix(){
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
}

function baseDirWindows(){
  console.error(this.string)
  var dir = this.string
    .replace(/^(.+?)(\/)?[*?].*$/, 
      function($0, $1, $2){
        return $2 ? $0 : $1
      })
  console.error(dir)
  console.error(dir)
  dir = dir
    .replace('\/', '')
  console.error(dir)
  var idx = dir.lastIndexOf('\\')
  dir = dir.substring(0, idx)
  console.error(dir)
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