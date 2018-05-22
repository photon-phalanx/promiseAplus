var promisesAplusTests = require('promises-aplus-tests')
var Adapter = require('./adapter')
var mocha = require('mocha')

describe('promises/A+的测试哦', () => {
  promisesAplusTests.mocha(Adapter)
})