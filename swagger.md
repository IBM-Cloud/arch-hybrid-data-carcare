# Swagger
Swagger is a language and associated tool set for defining a REST api.
Once created the server routing, verification and even implementation stubs can be generated.
The client libraries can also be generated.
Lots of lanagues are supported.

The json description of your site api is available for tools to read from your site.
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

