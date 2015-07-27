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

  #Test1  validates the home page for the app has the right title
  it 'has the expected title', ->
    expect(@driver.getTitle()).to.eventually.contain 'Hybrid Data Store'

  #Test2 finds the DOM element corresponding to the OBJECT STORAGE hyperlink,
  # clicks on it, waits for the page to load, and then validates that the url for the page is correct
  it 'navigates to correct page when clicking on object storage link', ->
    @driver.findElement(linkText: 'OBJECT STORAGE').click()
    @driver.manage().timeouts().pageLoadTimeout(10000)
    expect(@driver.getCurrentUrl()).to.eventually.equal 'http://localhost/osv2.html'  