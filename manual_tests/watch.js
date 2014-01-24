var Fireworm = require('../index')

var fw = Fireworm('manual_tests/a_dir', {
  ignoreInitial: false
})

fw.add('manual_tests/a_dir/*.js')
fw.add('manual_tests/a_dir/another_dir/*.js')

fw.on('add', function(pth){
  console.log(pth, 'was added')
  console.log('# of watchers', fw.numWatchers())
})
.on('remove', function(pth){
  console.log(pth, 'was removed')
  console.log('# of watchers', fw.numWatchers())
})
.on('change', function(pth){
  console.log(pth, 'was changed')
  console.log('# of watchers', fw.numWatchers())
})
.on('error', function(err){
  console.error(err.message)
  console.log('# of watchers', fw.numWatchers())
})