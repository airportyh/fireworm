var fs = require('fs')

var tid = null
function fire(){
  if (tid) clearTimeout(tid)
  tid = setTimeout(function(){
    console.log('fire!')
    tid = null
  }, 200)
}

fs.watch('a_dir', function(evt, filename){
  console.log(evt, new Date().getTime())
  fire()
})

fs.watch('a_dir/one.txt', function(evt, filename){
  console.log(evt, new Date().getTime())
  fire()
})

setInterval(function(){}, 1000)