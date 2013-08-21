var matches = require('../lib/matches_start')
var assert = require('assert')

if (process.platform !== 'win32'){

  test('should match globs', function(){
    assert(matches('foo/', 'foo/*.js'))
    assert(matches('foo/', 'foo/bar/*.js'))
    assert(!matches('foo/', 'bar/*.js'))
    assert(!matches('foo/', 'foobar/*.js'))
  })
  test('should match regexes', function(){
    assert(matches('foo/', /foo\/.*\.js/))
    assert(matches('foo/', /foo\/bar\/.*\.js/))
    assert(!matches('foo/', /bar\/.*\.js/))
    assert(!matches('foo/', /foobar\/.*\.js/))
    assert(!matches('foo/bar/', /foo\/[^\/]*\.js/))
  })
  test('should handle or expressions', function(){
    assert(matches('abc', /(abc|def)/))
    assert(!matches('ghi', /(abc|def)/))
  })

}

if (process.platform === 'win32'){

  test('should match globs', function(){
    assert(matches('foo\\', 'foo\\*.js'))
    assert(matches('foo\\', 'foo\\bar/*.js'))
    assert(!matches('foo\\', 'bar\\*.js'))
    assert(!matches('foo\\', 'foobar\\*.js'))
  })
  test('should match regexes', function(){
    assert(matches('foo\\', /foo\\\\.*\.js/))
    assert(matches('foo\\', /foo\\\\bar\\\\.*\.js/))
    assert(!matches('foo\\', /bar\\\\.*\.js/))
    assert(!matches('foo\\', /foobar\\\\.*\.js/))
    assert(!matches('foo\\bar', /foo\\\\[^\/]*\.js/))
  })
  test('should handle or expressions', function(){
    assert(matches('abc', /(abc|def)/))
    assert(!matches('ghi', /(abc|def)/))
  })

}