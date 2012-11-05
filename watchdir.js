
var fireworm = require('./fireworm')

var w = fireworm('.')
w.add('d/*.js')

w.on('change', function(filename){
    console.log(filename + ' changed')
})

setInterval(function(){}, 1000)