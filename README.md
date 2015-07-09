# Workload - Hybrid Data Storage

## Big Picture

[Block Diagram](diagram.png)


* [bluemix cfsworkloads](https://console.ng.bluemix.net/?direct=classic#/resources/orgGuid=b163c0f6-6d12-419b-b3d3-0c105e2294c7&spaceGuid=e2e09bbf-ff0e-488e-b19a-200565d173b6)
* [source code](https://hub.jazz.net/project/referenceapps/workloads)


## Running Locally

* Install node and npm on your computer. Note: Node is required not Node.js.
* Clone this project.
* `cd node`
* `npm install`
* `npm start`
* The /data directory on your computer will need to be writeable. 
* Check out bin/www.js it will indicate what the port# is.  Currently it is http:localhost:80.  You can visit this in a browser.  See the curl examples below.
* The /api/obj/... object storage requires credential configuration when run locally.  See OSV2 below.

## UI

* **NOTE: Additonal configuration for Object Storage (OSV2) and On Premise is required (see below)**.  Volumes work with no additional configuration.
* Allows upload of a file to Volume on disk, Object Storage, and On Premise.
* On page load, the list of files in Volume on disk, Object Storage and On Premise are displayed.

## Test Suite

The test suite is run with mocha.

    npm install -g mocha
    npm test

## API
Example curl from swift docs using cygwin.  `-T` upload a file.  `-i` include header information in the output. `-X` request command. `-F` form.  For a form, it must have one file and one optional field whose value is the real storage filename.  A get at the volume will retrieve a list of all the files.

    file=/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt
    host=localhost

    curl -v -i -T $file $host/api/vol/public/a.txt -X PUT
    curl -v $host/api/vol/public/
    curl -v $host/api/vol/public/a.txt -X GET
    curl -v $host/api/vol/public/a.txt -X DELETE
    curl -v -i -F "f=@$file" $host/api/vol/public/form -X POST
    curl -v -i -F "g=b.txt" -F "f=@$file" $host/api/vol/public/form -X POST

Object storage swap `vol` with `obj`.

    curl -v -i -T $file $host/api/obj/public/a.txt -X PUT
    curl -v $host/api/obj/public/
    curl -v $host/api/obj/public/a.txt -X GET
    curl -v $host/api/obj/public/a.txt -X DELETE
    curl -v -i -F "f=@$file" $host/api/obj/public/form -X POST
    curl -v -i -F "g=b.txt" -F "f=@$file" $host/api/obj/public/form -X POST
    curl -v $host/api/obj/public/a.txt -X DELETE

Similarly it is possible to read from the on premise by changing `vol` to `onprem`.

## Docker Image
See [Prerequisites for installing IBM Containers Extension (ICE)](https://www.ng.bluemix.net/docs/starters/container_cli_ov.html#container_prereq).
This documentation assumes familiarity with Docker and cf ic command line.
Create and run the Docker image using the Docker file:

    $ docker build -t medicarlocal .
    $ mkdir data && chmod 777 data
    $ docker run -d -p 80:80 -v $( pwd )/data:/data --name medicarlocal medicarlocal
    $ curl -l localhost

This should generate some output.  Use the curl commands from the API above to exercise the API.
When using the `/obj/` for object store be patient. The first time may take a while to establish the connection.

## Bluemix Docker 
Creating a build pipeline is the easiest way to build, test, and deploy to Bluemix.
You can manually perform these operations as well.
Find your Bluemix registry name using the Bluemix UI.  Be careful; it may not match the Bluemix "organization."
At the time of this writing, the registry name could be found in Bluemix > create a container > Your Image Registry URL: *URL*.
Mine is registry.ng.bluemix.net/acme.
The output of cf ic IP request below was 129.41.232.130.

    cf ic login ...
    docker tag medicarlocal registry.ng.bluemix.net/acme/medicarlocal
    docker push registry.ng.bluemix.net/acme/medicarlocal
    host=134.168.4.106
    cf ic run -p 80:80 --name medicarlocal registry.ng.bluemix.net/acme/medicarlocal
    cf ic ip request
    cf ic ip bind 129.41.232.130 medicarlocal
    curl -v -i -T $file $host/api/vol/public/a.txt -X PUT
    curl 129.41.232.130

This should generate some output.  
Use the curl commands in the API above using the X in the `cf ic ip bind` instead of localhost.


### Continue with Volume

If the container is running, you will need to stop and remove it.  

    cf ic ps
    cf ic stop medicarlocal
    cf ic rm medicarlocal

When using Docker, the volume is a directory on the computer running Docker.
In Bluemix this directory is created with the `cf ic volume` command.
Run a new container mounting the volume created earlier:

    cf ic volume create medicarvolume
    cf ic run -v medicarvolume:/data -p 80 --name medicarlocal registry.ng.bluemix.net/acme/medicarlocal
    cf ic ip bind 129.41.232.130 medicarlocal

Now the curl commands can be used to exercise the `vol` portion of the API and it will be persisted in the volume created:


    curl -i -T $file $host/api/vol/public/a.txt -X PUT
    curl $host/api/vol/public/

Repeat the steps above to `ps`, `stop`, `rm`, `run`, `ip bind` and verify the file is still available:


    cf ic ps
    cf ic stop medicarlocal
    cf ic rm medicarlocal
    cf ic run -v medicarvolume:/data -p 80 --name medicarlocal registry.ng.bluemix.net/acme/medicarlocal
    cf ic ip bind 129.41.232.130 medicarlocal
    curl $host/api/vol/public/

Great, curl is returning a table of contents that indicates the file is present.

## Container Groups

    cf ic group create -v medicarvolume:/data -p 80 --bind medicarlocalbind --name medicarlocal registry.ng.bluemix.net/acme/medicarlocal
    cf ic route map --hostname medicarlocal --domain mybluemix.net medicarlocal


## On Premise Repository

The on premise data store is being accessed through the Secure Gateway service.
Using the Bluemix UI, create the Secure Gateway service.

* Create the gateway in the service.
* Create the connection in the gateway.  As you will see below, the IP address of the computer that is running the records program locally is 158.85.183.50 and the port will be 8080.

On premise:
* Follow the instructions to `docker run` the Secure Gateway Docker image connecting back to the gateway above.  For me this was `docker run -d ibmcom/secure-gateway-client KhNfR9WOC8l_prod_ng`
* Run the on premise records app.  For me this was `docker run -d -p 8080:80 registry.ng.bluemix.net/acme/medicarlocal`
* Run the `ifconfig` command and verify that the IP address configured in the gateway above is correct.  For me `ifconfig` displayed the following, so I'm good to go.

  	eth1      Link encap:Ethernet  HWaddr 06:9f:f1:b6:50:cc
  	          inet addr:158.85.183.50  Bcast:158.85.183.63  Mask:255.255.255.224

On the computer that is running the Secure Gateway Docker image, I verified the following command returned some stuff from the records app.

    # curl 158.85.183.50:8080

On any computer on the planet I could verify that the sg connection is working correctly.  In the Bluemix UI, open the info on the connection (you will find the connection within gateway which is in the Secure Gateway service).  For me the Cloud Host:Port was cap-sg-prd-2.integration.ibmcloud.com:15188

    $ curl cap-sg-prd-2.integration.ibmcloud.com:15188

### Making Secure Gateway secure with TLS

Here are the steps needed to make the Secure Gateway secure:

* From Bluemix dashboard, add the Secure Gateway service from the Integration category.
* In Add Service, select Leave unbound in the App field and select Standard in the Selected Plan field.  Click Create.
* Click Add Gateway.
* Enter a name for the gateway, e.g. sgtls.  Click on checkbox for Enforce security token on client, then click Connect.
* Copy the Docker command given in the Copy box: `docker run -it ibmcom/secure-gateway-client UtEvxKKGXuk_prod_ng`
* Log into the on-prem server with root or sudo privilege.  Run the Docker command in the previous step above.
* After the Docker command is run, on the Secure Gateway dashboard in Bluemix, you should see that the tunnel has been established.
* Click on Add Destinations to connect to the on-prem app (e.g. medical-records app) behind the Secure Gateway Client on the on-prem server.  Fill in the name for the destination, the IP address (or hostname) and port of the on-prem app, and select TLS: Mutual Auth for this destination.
* Under the Advanced section, ensure that the checkbox for Auto generate cert and private key is checked.  For now, we don't configure client-side TLS because we are primarily interested in establishing a secure tunnel between our Bluemix app and the on-prem environment (i.e. the application-side TLS), not the connection between the Secure Gateway Client and the on-prem app.
* After clicking I'm Done in the previous step, we can download the certificate and key (in a zip file) needed to connect to the on-prem app by clicking on the gear icon and selecting Download Keys.  Unzipping the certificate file has the following contents:

  	root@devops1:~/khoa/bm-objectstore/certificate# unzip cAMkmBrJozI_X4m_certs.zip
  	Archive:  cAMkmBrJozI_X4m_certs.zip
  	inflating: DigiCertTrustedRoot.pem
  	inflating: secureGatewayCert.pem
  	inflating: DigiCertCA2.pem
  	inflating: cAMkmBrJozI_X4m_cert.pem
  	inflating: cAMkmBrJozI_X4m_key.pem

* At this point, we can create a user-provided service that contains the on-prem app's destination and access information, as well as the certificate and key information in a JSON file.  For example, if the on-prem app is a database, the json file could look something like:
`{"dbname": "<db name>","dbpw": "<dbpassword>","dbuser": "root","host": "<something.ibmcloud.com>","port": "<port number>","key":"<keyFileContents>", "cert":"<certFileContents>", ...}`

Note that the key and cert information are provided as key value pairs in the JSON file.  The keyFileContents and certFileContents are stored in the <destination_id>_key.pem and <destination_id>_cert.pem files, respectively.  In our example, here's the contents of the cAMkmBrJozI_X4m_key.pem file:

	root@devops1:~/khoa/bm-objectstore/certificate# cat cAMkmBrJozI_X4m_key.pem
	-----BEGIN PRIVATE KEY-----
	MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7OAWA3GuvjF7s
	0x1ix6/h92HjebXeU/69LoK3KOvxc6ntNKrnJ3F6cLN63MONXMBRYUP+s/FPHgTA
	XHiUQTpatuk598mQBzIb9ZjnzmEtgGP+ki4RozHIJyCBg3fD5jySFQGgdDBLnSF/
	CZyPJAvBXv91WTM5Yq3jPHWsYI5LFxyM1/XQA23A7W9V40f6ZwhVa89D8bcEcGDt
	UuqIDgYUaCkdVgcbrU6gZ+hhdUM6s7frfBPoZiXhA8skjf6loP+NmSyq4Farn3iz
	/NmxVojGMXLKC73lLJeyaS8a0US1BDuZHQZGnGHxjsfrb+isb7Jj0OvQqiT3Pp/k
	Im7Thk7fAgMBAAECggEAeVUINAgl/gJB7sevTrpNYWu60/qoBCt5d0+yRVPO/Y9R
	PDqa2+3zHD/4AZMbZP0MYnFf6Kzjobu5ppUHTEWttOa/5eKRjbcsIXScoPZegmen
	5m8ETkfuVmINLgJu1tXawW29vSgvuIFgGP24qgfZWnvfoUSq7vDl8tPXC10UOtLm
	xmsfbIe2/G8261zmS8JUjjA9dZCeO4Bl3/Mw1iuQIPLzT1JLA7mTVazVXei7JuPn
	pJl0PeEpOYIwOVUTNpZQ9SiEw7KvRZvxxTHNmSXPtttd5HC6zc0QOPotimi0gwzd
	uEBriTaDSm8j3CliAL4ma5CdCK2ZIhh9T37nsKWq6QKBgQDf9cb0AY3RqtMVK89P
	2jywVeKAgfupVrE/wYHXH33gz5sHuCg6llOLbwV3MxC0XeN2ipZrd3ybwnM4g8dO
	6sA17K12dxZUMDb+naiPyyuZNkaCnE6UrI7mFLy4guc4lW2oHpZv4zmv7NSH73U2
	t63MKew9BxKiPIq/IRsoGBGMFQKBgQDWAKX2TWaZNdwhMLcYgbVZzy4akWRo2QmN
	mesGXn0rboENM7JZvebbRtdGs7MFl3yJxq42mCRUaukqHEl1cQJ1jNQlLT2dV1nk
	+b563BA6ua/UU9DmLoJH/446FlYsML7ss23e23yDeDDopWOHKsebMwWbSxFXwY7b
	AXuMiCGIIwKBgBNOyxIqOCHFSmFe34aQ1/6TyO0vR5T3xlwqwJjdPCrvevwVYlJ6
	t0UkEyKNonkKRxvnIsStDm8XOnu60Kn7DwsXFnVKGwCzD2qwCOIsr9uLlFSaSSQE
	JGWtj/+QOYLlTwjZajrHKigCkOgPOtm2yCL70kQIohCei4+iuQah3JFpAoGBAM2b
	ddi86NRO8R5aZa///zM4YP1Zr3UlAY6w0SQfaHdwBkGe575dPA51c6QURu4aa6cb
	4onFhzIsPbUd1F4no8s48SJ+4vHm2RGr+ZylDlq9yPdhSBW/naB7IjUg/M4cT3Ov
	uOIjUvAlbCg5rvRQ39J3JO3dI96CszQrqn6M1FqtAoGAIBmlXfX7vUbTWKJblHRd
	EZTYTAQA3tEvhRNRM7KInA6WgL3fXurzR4JBAsN+z/9R4/OC93WtP4qEp14AsV2P
	DvuAKfwDLH1lXSgxWFmFmVk2/hCkPg3UFoLdOiOBHLlVo/eBrcUGK59b3deidOot
	xKOhe8y77M5dSwG5YITRBKw=
	-----END PRIVATE KEY-----

The entire contents needs to be copied into the JSON file.

* Run the `cf cups` command as follows:
  	cat <json_file> | xargs cf cups  -p

* Bind the user-provided service to the Bluemix app, so that the app can access the credentials through VCAP_SERVICES.  Once the service is bound to our Bluemix app, the app can access VCAP_SERVICES as follows:

  	var VCAP_SERVICES = process.env.VCAP_SERVICES;
  	var userProvided = {};

  	if(VCAP_SERVICES){
  		vcap = JSON.parse(VCAP_SERVICES);
  		userProvided = vcap["user-provided"][0].credentials;
  		console.log(vcap);
  	}

  	var options = {
   		host: userProvided.host,
   		port: userProvided.port,
   		key: userProvided.key,
   		cert: userProvided.cert,
   		ca: userProvided.cacert,
   		rejectUnauthorized: true
  	};


# IDS Pipeline

The IDS pipeline will consist of the following stages, which will be triggered upon pushing any change to the project:
1. Integration Tests - runs tests on the Node.js code
2. Build - builds the container image
3. Deploy to Staging - deploys the container group to the dev space of the organization
4. Load Test - runs a JMeter test script to generate a load on the server running in the dev space to test container group scaling and load balancing
5. Deploy to Production - deploys the container to the prod space of the organization using Active Deploy

## Integration Tests

## Build
This is a standard container Build stage.  Add a stage, call it Build, take the defaults, add a Build job, take the defaults, set your image name, and click Save.

## Deploy to Staging
Add a stage, call it Deploy to Staging, take the defaults, add a Deploy job, set the Deployer Type to IBM Containers on Bluemix, take the defaults, specify port 80.

From there, we need to do the following:
1. Deploy a container group rather than a single container.
2. Specify a route so we have a static URL to access our app once deployed.
3. Create and add volume storage to the container.

In the Deployer script, scroll down until you see the line that calls deploycontainer.sh and comment it out.  This is the script that deploys a single container.  We don't want that.

Scroll down a little further until you see the commented line that would call deploygroup.sh and uncomment it.  This is the script that deploys a container group which is what we want.

The deploygroup.sh script will look for certain environment variables to trigger things such as setting up the route and adding the volume storage.  Go to the Environment Properties tab of the stage and add the following text properties:

  	ROUTE_HOSTNAME = medicar-staging
  	ROUTE_DOMAIN = mybluemix.net
  	OPTIONAL_ARGS = "-v medicarstagingvolume:/data"
The first two properties will be used to setup the route to the app once it is deployed and will result in the app being made available at medicar-staging.mybluemix.net.  The last property will be passed to the ICE command that deploys the container group and will attach the volume storage where files will be persisted across deployments of the app.

Prior to running this stage of the pipeline, be sure to create the volume storage by running the following command.  It only needs to be run once.

  	cf ic volume create medicarstagingvolume

Save the stage.

## Load Test
We'll use JMeter to generate a load on the server to ensure the REST API is working properly.  This will also give us a chance to review the monitoring and logging functionality offered by the Bluemix container service.  By reviewing that, we'll be able to see if container auto-scaling and load balancing is working properly.

The test script we will use is in the project under the tests directory.  You can review it by installing JMeter from http://jmeter.apache.org and opening the script using JMeter.

Upon reviewing the script, you will see that it exercises each of the REST functions offered by the app; PUT <file>, GET, GET <file>, and DELETE <file> to upload a file, get a file listing, download the contents of a file, and delete a file respectively.  The script does this for each of the storage types offered in this hybrid storage app which are volume storage and object storage.

The script is configured by default to simulate 600 users accessing the app two seconds apart from one another.

To run this script in the IDS pipeline, add a stage to the pipeline and name it Load Test.

On the Inputs tab, select the following:

	Input Type = Build Artifacts
	Stage = Integration Tests
	Job = Build

	Automatically execute jobs when the previous stage completes successfully

Using the build artifacts from the Integration Tests stage we ran earlier in the pipeline will grab the files that were archived by that stage.  Since that is the stage where we cloned the project, the project contents were archived by that stage.  This is how the JMeter script will be made available to this stage.

On the Jobs tab, add a Test job and set the Tester Type to Simple.

Also, set the Working Directory to tests since that is where all of the test files live in our project.

Copy the following script into the Test Command section:
	#!/bin/bash
	echo "Installing JMeter..."
	sudo apt-get update && sudo apt-get -y install jmeter
	
	# Pass the location of the test inputs directory within the project to JMeter so 
	# it knows where to find the input files.
	test_inputs="$(pwd)/inputs"
	
	# Run the test
	echo "Running JMeter load test..."
	jmeter -n -Jjmeter.save.saveservice.output_format=csv -JtestInputs=${test_inputs} -t ${test_script} -l ${results_file} -j ${log_file}
	
	# Dump the log and the results into the console
	echo "JMeter log:"
	cat -A ${log_file}
	echo
	echo "Test results:"
	cat -A ${results_file}
	
	# Check for errors and exit accordingly
	errors="$(grep -c .*,.*,.*,.*,.*,.*,.*,false,.*,.* load.jtl)"
	if [ "${errors}" -ne "0" ]; then
        	echo -e "${red}Load test failed.  ${errors} errors were found.${no_color}"
	        exit 1
	fi
After we set a few environment variables, this script will install JMeter, run the script, parse the results, and fail if there are errors.

On the Environment Properties tab, set the following Text Properties.  These will be used by the script we just added to the job:

	test_script = load.jmx
	results_file = load.jtl
	log_file = jmeter.log
Save the stage.

## Deploy to Production
This is pretty much the same as the Deploy to Staging step as described above.  Just be sure to specify the prod space rather than the dev space and set the route and volume information to point to the production instances rather than the staging instances.

# OSV2 - Object Storage Version 2

## Create OSV2 service

This is a IBM hosted version of swift over open stack.
Using the Bluemix GUI, create the OSV2 service using Add Service or API then choose Object Storage (v2).
Once the service has been created, click it to go to the details view. Select the cloud to use (in this case IBM Cloud Public) and click Save.
The service can be bound to a Bluemix Application (Note: Bluemix supports Applications, Containers and Virtual Machines).
See below for more information on containers.

## Node.js source code

There are 3 different ways to configure the credential system for the OSV2 in this app.
See the config.js source code and specifically the two exported variables:

* Bluemix binding (see below)
* module.exports.processEnvVCAP_SERVICES - copy in bound credentials (use in non Bluemix environment)
* module.exports.osv2ServiceCredentials - copy in service credentials (use in non Bluemix environment)

As described below, the proper way to bind the credentials when running on Bluemix is to bind via the VCAP environment variable.
When working on your desktop, this won't be possible but the value of the environment variable can be added to the processEnvVCAP_SERVICES.
Finally, if the VCAP environment variable cannot be determined, check the service -- it may provide the credentials which can be copied into osv2ServiceCredentials.
The code has examples of the kinds of strings that are expected.

## Binding OSV2 on Bluemix


An intermediate Bluemix Cloud Foundry application is required to bind a service directly to a container.
This is described in the container docs which,
at the time of this writing, can be found at [Optional: Binding a service to a container](https://www.ng.bluemix.net/docs/starters/container_ui.html#container_ui).

In the Bluemix GUI:

* Create a Node.js application. Give it the name medicarlocalbind.
* Back in the dashboard, click the medicarlocalbind app.
* Click "Bind a service or API" and bind the OSV2 service created earlier.

Back in the command line:

    cf ic ps
    cf ic stop medicarlocal
    cf ic rm medicarlocal
    cf ic run -v medicarvolume:/data -p 80 --name medicarlocal -e CCS_BIND_APP=medicarlocalbind registry.ng.bluemix.net/acme/medicarlocal
    cf ic ip bind 129.41.232.130 medicarlocal
    curl $host/api/vol/public/

## Credential and Session Handling
To allow access to the private storage areas, user credentials must be provided.
For API these can be provided in the curl commands (or equivalent) via the `-u` user:password.

    curl -u powell:ppw $host/api/vol/private
    curl -v -u powell:ppw -i -T $file $host/api/vol/private/a.txt -X PUT
    curl -v -u powell:ppw $host/api/vol/private/
    curl -v -u powell:ppw $host/api/vol/private/a.txt -X GET
    curl -v -u powell:ppw -i -F "f=@$file" $host/api/vol/private/form -X POST
    curl -v -u powell:ppw -i -F "g=b.txt" -F "f=@$file" $host/api/vol/private/form -X POST
    curl -v -u powell:ppw $host/api/vol/private/a.txt -X DELETE


## Passport

[Passport](http://passportjs.org/docs) is an authentication middleware for node.
The first two passport strategies were local and http basic.
The following building blocks are used:

An authentication middleware function is created for each of these:

    passport.authenticate('local',...)
    passport.authenticate('basic', ...)

The strings local and basic are part of the two registered passport strategies:

    var passportLocal = require('passport-local');
    var BasicStrategy = require('passport-http').BasicStrategy;

They are configured and bound to passport using:

    passport.use(new passportLocal(getIdForUserPassword));
    passport.use(new BasicStrategy({}, getIdForUserPassword));

More specifically the local strategy is bound to a post request which is sent by the login page:

    app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}));

This causes a function to be called with the 
username and password attributes in the body of the request
provided by the html <form> element.
In our case the function:

    function getIdForUserPassword(username, password, done) {...}

is called and if the credentials are good an object is returned that will become the req.user object:

    return done(null, {
        id: user.id
    });

This object is associated with the session and serialized.
Serialization can create a smaller key representing a large amount of user data.
Subsequent http requests will deserialize and allow the inflation of the user data based on the serialized key.
The deserialized data will be available in req.user

Each future http request for the same session will deserialized the user.
In our case no external storage is required but for demonstrational purposes a object {id: "value"} represents the users
and is reduced (serialized) to just "value" and then inflated (deserialized) to {id: "value"}

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, {id: obj});
    });


## passport-google
See [google guick-start app for Node.js](https://developers.google.com/identity/toolkit/web/quickstart/nodejs)

For the service account the password for the private key is notasecret


Using [passport-google](https://github.com/jaredhanson/passport-google) is not longer supported.  The end result was [OpenID 2.0 for Google Accounts has gone away](https://support.google.com/accounts/answer/6206245?p=openid&rd=1)

## single sign on SSO bluemix service
The goal is to have a service available to the medicar container.
It is currently required to have a "binding" or "bridge" Cloud Foundation Application to get at the services when using Containers or Container Groups.
See 

* Create a cf app to bind to the service: medicarbridge
  * What kind of app: WEB
  * what kind do you want to start with: SDK for Node.js
  * do not add a service or api - this will be done later
* Back in the dashboard create a service
  * App: leave unbound
  * Service name: medicarsso
* Back in the dashboard select the medicarsso service
  * configure and deply - provide a name: medicarsso
  * give name: Cloud Directory - 
  * Add user admin, admin.password, Admin, Istrator
  * Add user powell, ppw, Powell, Rock  - if you want to run the unit tests
  * email: blank
* Back in the dashboard Bind services to medicarbridge
  * Open medicarbridge
  * Select Overview to Bind a Service or API - medicarsso
* Back in the dashboard Integrate the medicarsso service
  * Open medicarbridge - must open the app first, Choose INTEGRATE in the upper right:
  * The Return-To-URL needs to be associated with the real app, not the bridge app.  For me it was: https://medicar-staging.mybluemix.net/auth/sso/callback
  * The display name should also be associated with the real app
  * Download the required file for the Node.js app, the file is passport-idaas-openidconnect.zip and I unzipped it into the lib/ directory



Note that in order to debug on my local computer I added the following line to my /etc/hosts file (windows c:\WINDOWS\system32\drivers\etc\hosts) 

    127.0.0.1       medicar-staging.mybluemix.net


* Facebook
  * Check out [](https://developers.facebook.com/docs/facebook-login/login-flow-for-web/v2.4)
  * Create the Web "medicar" app, Category "Business", likely does not matter
  * Save away the client id and secret these will be required to configure the passport facebook strategy
  * Determine the hostname and the callback path in the app.  A good place to start is http://localhost/auth/facebook/callback.
  localhost will need to be adjusted to the name of the final app in bluemix.

        var facebookCallbackPath = '/auth/facebook/callback';
        passport.use(new FacebookStrategy({
            clientID: facebookConf.clientID,
            clientSecret: facebookConf.clientSecret,
            callbackURL: hostname + facebookCallbackPath,


## Jmeter locally
jmeter testing can be run locally.
On Windows I did the following:

    # install jmeter 
    cd medicar\tests
	set test_inputs=inputs
	set test_script=load.jmx
	set results_file=load.jtl
	set log_file=jmeter.log
    C:\powell\jmeter\apache-jmeter-2.13\bin\jmeter -- this is where jmeter was intalled, run the gui and navigate to the test_inputs directory
    C:\powell\jmeter\apache-jmeter-2.13\bin\jmeter -n -Jjmeter.save.saveservice.output_format=csv -JtestInputs=%test_inputs% -t %test_script% -l %results_file% -j %log_file% -Jserver=localhost

## what
One time cf login asked me for API> and the answer was api.ng.bluemix.net

cf login -a api.ng.bluemix.net

node version: v0.10.32

google 


## summary of services

mongo data base is required.  In the VCAP_SERVICES it must have an *name* of *medicarmongo*.  Here is an example:

    "VCAP_SERVICES": {
        "mongolab": [
          {
          "name": "medicarmongo",
          "label": "mongolab",
          "plan": "sandbox",
          "credentials": {
            "uri": "mongodb://IbmCloud_vugkd6vn_bsi06h9f_l0ro0s1e:NuN0Fwi-5zLqXptHUyefjwWvEWAwMo_D@ds055110.mongolab.com:55110/IbmCloud_vugkd6vn_bsi06h9f"
          }
        }

Single Sign On.  In the VCAP_SERVICES it must have a *name* of *medicarsso*

    "VCAP_SERVICES": {
      "SingleSignOn": [
        {
          "name": "medicarsso",
          "label": "SingleSignOn",
          "plan": "standard",
          "credentials": {
            "secret": "izMN9P3pJw",
            "tokenEndpointUrl": "https://medicarsso-r12998984j-ctw5.iam.ibmcloud.com/idaas/oidc/endpoint/default/token",
            "authorizationEndpointUrl": "https://medicarsso-r12998984j-ctw5.iam.ibmcloud.com/idaas/oidc/endpoint/default/authorize",
            "issuerIdentifier": "medicarsso-r12998984j-ctw5.iam.ibmcloud.com",
            "clientId": "JE9JE3rNPd",
            "serverSupportedScope": [
              "openid"
            ]
          }
        }   


Object Storage Version 2.  In the VCAP_SERVICES, the 0 entry should be:

    "VCAP_SERVICES": {
       "Object Storage": [
         {
           "name": "osv2-pquiring",
           "label": "Object Storage",
           "plan": "Free",
           "credentials":
             {
               "auth_url": "https://objectstorage.ng.bluemix.net/auth/8259e199-3520-4de6-9180-411aa1788095/2ad3fe49-83e6-492a-836c-bf958318fc0f",
               "username": "80ce884743da644807120849ca2938bd380c3374",
               "password": "52bea2ee6fd6666a06dd230ef4fa4c7e7eec0b9f4b144b4cc27a715cf38f"
             }
          }
        ]
    }';

