module.exports = throttle
function throttle(fn, timeout){
  function serializeArgs(args){
    return Array.prototype.slice.apply(args) + ''
  }
  var lock = {}
  return function(){
    var self = this
    var args = arguments
    var key = serializeArgs(args)
    var timer
    if (timer = lock[key]){
      return
    }else{
      fn.apply(self, arguments)
      lock[key] = setTimeout(function(){
        delete lock[key]
      }, 200)
    }
  }
}