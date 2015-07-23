selenium = require 'selenium-webdriver'
chai = require 'chai'
chai.use require 'chai-as-promised'
expect = chai.expect

before ->
  @timeout 15000
  @driver = new selenium.Builder()
    .withCapabilities(selenium.Capabilities.chrome())
    .build()
  @driver.getWindowHandle()

after ->
  @driver.quit()

describe 'Front-end Testing', ->
  beforeEach ->
    @driver.get 'http://localhost:80'

  it 'has the expected title', ->
    expect(@driver.getTitle()).to.eventually.contain 'Hybrid Data Store'

  