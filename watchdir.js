var fs = require('fs')

fs.watch('d', function(evt, filename){
    console.log('dir ' + evt, filename)
})

setInterval(function(){}, 1000)