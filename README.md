# Workload - data scale out

# running

* install node and npm on your computer
* clone this project
* cd node
* npm install
* npm start
* the /data directory on your computer will need to be writeable 
* check out bin/www it will indicate what the port# is.  Currently it is http:localhost:3000.  You can visit this in a browser.  See the curl examples below.

# test suite

The test suite is run with mocha.

    npm install -g mocha
    npm test

# curl
Example curl from swift docs using cygwin.  -T upload a file.  -i include header information in the output. -X request command. -F form.  For a form it must have one file and one optional field whose value is the real storage filename.  A get at the volume will retrieve a list of all the files.

    curl -v -i -T /cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt localhost:3000/api/vol/public/a.txt -X PUT
    curl -v localhost:3000/api/vol/public/
    curl -v localhost:3000/api/vol/public/a.txt -X GET
    curl -v localhost:3000/api/vol/public/a.txtx -X DELETE
    curl -F password=@/etc/passwd www.mypasswords.com
    curl -v -i -F "f=@/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt" localhost:3000/api/vol/public/form -X POST
    curl -v -i -F "f=@/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt" -F "g=b.txt" localhost:3000/api/vol/public/form -X POST

# background

These are the services that need to be worked into the scenario.

* object storage v2
* containers + groups
* vm + groups
* update - red/black deploy
* machine translation

Possibilities:

* sso for credential management
* 

# API

Under construction... See the curl above for the current state of things.

A rest API will be used for the back end program to exercise the services.
Here are the dimensions that could effect the API

* access - public/private
* storage - /vol/obj/op - fs image or container file system, volume mounted volume or block storage, obj object storage v1, op on premise
* caching - memcacheLocal/memcacheService/
* rw - ro/rw


Batch operations.
* script

Examples https://workloads.mybluemix.net/api/

* POST vol/public/id - add a file that can be GET using this same URL
* GET obj/private/id - get the file 
* GET vol/public?search=subset - return a listing, optionally specifying a subset.

Swagger will be used for the rest API. 

# busboy
A node.js module for parsing incoming HTML form data.
On 5/13/2015 npm reported 22,000 downloads in the last week

# Swagger
Swagger is a language and associated tool set for defining a REST api.
Once created the server routing, verification and even implementation stubs can be generated.
The client libraries can also be generated.
Lots of lanagues are supported.

The json description of your site's api is available for tools to read from your site.
A simple gui can also be generated to exercise the api.

See the [swagger editor](http://editor.swagger.io)


Notice: https://github.com/swagger-api/swagger-codegen/issues/725 for generating node.js from swagger editor.
Add the x-swagger-router-controller property within each path (like /vol below).
And after generating the node.js server (see the Generate Server drop down) export the file as json and manually replace the api/swagger.json file that was incorrectly generated.


    paths:
      /vol:
        x-swagger-router-controller: Default

Turn on some debugging information by setting the environment variable if you need help.
I actually do this in the code of the app:

    process.env['DEBUG'] = 'finalhandler,connect:*,swagger-tools:*,express:*';


Before running the node program: npm install

    npm install
    node index.js

## making the app

* express d
* cd d
* package.json:

    "swagger-tools": "0.8.*"
    "busboy": "^0.2.9",
    "rimraf": "^2.3.4", - remove the temporary directory when the program starts
    sanitize-filename - check for bad filename characters


* edit the app.js to include the standard swagger middleware initialization

    // swaggerRouter configuration
    var options = {
      swaggerUi: '/swagger.json',
      controllers: './controllers',
      useStubs: process.env.NODE_ENV === 'development' ? true : false // Conditionally turn on stubs (mock mode)
    };

    // The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
    var swaggerDoc = require('./api/swagger.json');

    // Initialize the Swagger middleware
    swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {
      // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
      app.use(middleware.swaggerMetadata());

      // Validate Swagger requests
      app.use(middleware.swaggerValidator());

      // Route validated requests to appropriate controller
      app.use(middleware.swaggerRouter(options));

      // Serve the Swagger documents and Swagger UI
      app.use(middleware.swaggerUi());
    });

* npm install

* download swagger nodejs, replacing api/swagger.json


    Generate the nodejs server code.
    File > download json
    GenerateServer > Nodejs

* cp .settings if you want to run the microsoft code debugger
* edit the controllers/Default or use the good one

Run the program and you should see the following:

http://localhost:3000/api-docs - swagger json document
http://localhost:3000/docs/ - swagger ui


    

# Creating

Install node and npm.
