var Fireworm = require('../index')

var fw = Fireworm('manual_tests/a_dir')

fw.add('manual_tests/a_dir/*.js')
fw.add('manual_tests/a_dir/another_dir/*.js')

fw.on('add', function(pth){
  console.log(pth, 'was added')
})
.on('remove', function(pth){
  console.log(pth, 'was removed')
})
.on('change', function(pth){
  console.log(pth, 'was changed')
})
.on('error', function(err){
  console.error(err.message)
})