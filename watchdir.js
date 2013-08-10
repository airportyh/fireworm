var fs = require('fs')

fs.watch('a_dir', function(evt, filename){
  console.log(evt, filename)
})

fs.watch('a_dir/one.txt', function(evt, filename){
  console.log(evt, filename)
})

setInterval(function(){}, 1000)