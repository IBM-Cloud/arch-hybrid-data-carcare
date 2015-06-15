# Workload - Hybrid Data Storage

June 2015 MVF defined [Workload Requirements](https://releaseblueprints.ibm.com/display/IDC/Workload+Requirements)
VM's were not in plan for June so containers were substituted.  Autoscaling was replaced by groups.

## Big Picture

[Block Diagram](diagram.png)


* [bluemix cfsworkloads](https://console.ng.bluemix.net/?direct=classic#/resources/orgGuid=b163c0f6-6d12-419b-b3d3-0c105e2294c7&spaceGuid=e2e09bbf-ff0e-488e-b19a-200565d173b6)
* [source code](https://hub.jazz.net/project/referenceapps/workloads)


## Running Locally

* install node and npm on your computer (note that node is required not nodejs)
* clone this project
* cd node
* npm install
* npm start
* the /data directory on your computer will need to be writeable 
* check out bin/www.js it will indicate what the port# is.  Currently it is http:localhost:80.  You can visit this in a browser.  See the curl examples below.

## UI

* Allows upload of a file to Object Storage, On Premise, and Volume on Disk
* On page load the list of files in Object Storage, On Premise, and Volume on Disk are displayed

## test suite

The test suite is run with mocha.

    npm install -g mocha
    npm test

## API
Example curl from swift docs using cygwin.  -T upload a file.  -i include header information in the output. -X request command. -F form.  For a form it must have one file and one optional field whose value is the real storage filename.  A get at the volume will retrieve a list of all the files.

    file=/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt
    host=localhost

    curl -v -i -T $file $host/api/vol/public/a.txt -X PUT
    curl -v $host/api/vol/public/
    curl -v $host/api/vol/public/a.txt -X GET
    curl -v $host/api/vol/public/a.txt -X DELETE
    curl -v -i -F "f=@$file $host/api/vol/public/form -X POST
    curl -v -i -F "f=@$file -F "g=b.txt" $host/api/vol/public/form -X POST

Object storage swap the vol -> obj

    curl -v -i -T $file $host/api/obj/public/a.txt -X PUT
    curl -v $host/api/obj/public/
    curl -v $host/api/obj/public/a.txt -X GET
    curl -v $host/api/obj/public/a.txt -X DELETE
    curl -v -i -F "f=@$file $host/api/obj/public/form -X POST
    curl -v -i -F "f=@$file -F "g=b.txt" $host/api/obj/public/form -X POST
    curl -v $host/api/obj/public/a.txtx -X DELETE

Similarly it is possible to read from the on premise: chage **vol** to **onpremise**

## Docker Image
Create and run the docker image using the docker file:

    $ docker build -t medicarlocal .
    $ mkdir data && chmod 777 data
    $ docker run -d -p 80:80 -v $( pwd )/data:/data medicarlocal
    $ curl -l localhost

This should generate some output.  Use the curl commands from the API above to exercise the API.
When using the /obj/ for object store be patient, the first time may take a while to establish the connection.

## Bluemix Docker 
Creating a build pipeline is the easiest way to build, test, and deploy to bluemix.
But is is possible to manually perform these operations as well.
Find your bluemix registry name using the bluemix UI.  Be careful it may not match the bluemix "organization".
At the time of this writing it could be found at the bluemix > create a container > Your Image Registry URL:
Mine is: registry-ice.ng.bluemix.net/acme.
The output of ice ip request below was 129.41.232.130

    ice login ...
    docker tag medicarlocal registry-ice.ng.bluemix.net/acme/medicarlocal
    docker push registry-ice.ng.bluemix.net/acme/medicarlocal
    ice run -p 80 --name medicarlocal acme/medicarlocal
    ice ip request
    ice ip bind 129.41.232.130 medicarlocal
    curl 129.41.232.130

This should generate some output.  
Use the curl commands in the API above using the X in the *ice ip bind* instead of localhost.


### Continue with volume:

If the container is running you will need to stop and remove it.  
First find the *Container Id* using ice ps.  Mine was 3850564c-7b1c-4596-a005-224a543bece5

    ice ps
    ice stop 3850564c-7b1c-4596-a005-224a543bece5
    ice rm 3850564c-7b1c-4596-a005-224a543bece5

When using docker the volume is a directory on the computer running docker.
On bluemix this directory is created with the *ice volume* command:
Run a new container mounting the volume created earlier:

    ice volume create medicarvolume
    ice run -v medicarvolume:/data -p 80 --name medicarlocal acme/medicarlocal
    ice ip bind 129.41.232.130 medicarlocal

now the curl commands can be used to exercise the *vol* portion of the api and it will be persisted in the volume created:


    curl -i -T $file $host/api/vol/public/a.txt -X PUT
    curl $host/api/vol/public/

Repeat the steps above to ps, stop, rm, run, ip bind and verify the file is still available:


    ice ps
    ice stop 3850564c-7b1c-4596-a005-224a543bece5
    ice rm 3850564c-7b1c-4596-a005-224a543bece5
    ice run -v medicarvolume:/data -p 80 --name medicarlocal acme/medicarlocal
    ice ip bind 129.41.232.130 medicarlocal
    curl $host/api/vol/public/

Great, curl is returning a table of contents that indicates the file is present.

## Container Groups

    ice group create -v medicarvolume:/data -p 80 --name medicarlocal acme/medicarlocal
    ice route map --hostname medicarlocal --domain mybluemix.net medicarlocal


## On Premise repository

The on premise data store is being accessed through the secure gateway service.
Using the bluemix UI create the secure gateway service.

* Create the gateway in the service.
* Create the connection in the gateway.  As you will see below the IP address of the computer that is running the records program locally is 158.85.183.50 and the port will be 8080

On premise:
* Follow the instructions to docker run the secure gateway docker image connecting back to the gateway above.  For me this was: docker run -d ibmcom/secure-gateway-client KhNfR9WOC8l_prod_ng
* Run the on premise records app.  For me this was:  docker run -d -p 8080:80 registry-ice.ng.bluemix.net/acme/medicarlocal
* Do an ifconfig and verify that the IP address configured in the gateway, above, is correct.  For me ifconfig displayed the following so I'm good to go

    eth1      Link encap:Ethernet  HWaddr 06:9f:f1:b6:50:cc
              inet addr:158.85.183.50  Bcast:158.85.183.63  Mask:255.255.255.224

On the computer that is running the secure gateway docker image I verified the following command returned some stuff from the records app.

    # curl 158.85.183.50:8080

On any computer on the planet I could verify that the sg connection is working correctly.  In the bluemix ui open the info on the connection (you will find the connection within gateway which is in the secure gateway service).  For me the Cloud Host:Port was cap-sg-prd-2.integration.ibmcloud.com:15188

    $ curl cap-sg-prd-2.integration.ibmcloud.com:15188

### Making Secure Gateway secure with TLS

Here are the steps that would be needed to make the Secure Gateway secure:

* From Bluemix dashboard, add the Secure Gateway service from the Integration category
* In Add Service, select Leave unbound  for apps and Standard plan.  Click Create.
* Click Add Gateway
* Enter a name for the gateway, e.g. sgtls.  Then click on checkbox for Enforce security token on client.  Then click Connect.
* Copy the docker command given in the Copy box:  docker run -it ibmcom/secure-gateway-client UtEvxKKGXuk_prod_ng
* Log into the on-prem server with root or sudo privilege.  Run the docker command in the previous step above.
* After the docker command is run, on the Secure Gateway dashboard in Bluemix, you should see that the tunnel has been established
* Click on Add Destinations to connect to the on-prem app (e.g. medical-records app) behind the Secure Gateway Client on the on-prem server.  Fill in the name for the destination, the IP address (or hostname) and port of the on-prem app, and select TLS: Mutual Auth for this destination.
* Under Advanced section, ensure that the checkbox for Auto generate cert and private key is checked.  For now, we don't configure client-side TLS because we are primarily interested in establishing a secure tunnel between our Bluemix app and the on-prem environment (i.e. the application-side TLS), not the connection between the Secure Gateway Client and the on-prem app.
* After clicking I'm Done in the previous step, we can download the certificate and key (in a zip file) needed to connect to the on-prem app by clicking on the gear icon and select Download Keys.  Unzipping the certificate file has the following contents:

	root@devops1:~/khoa/bm-objectstore/certificate# unzip cAMkmBrJozI_X4m_certs.zip
	Archive:  cAMkmBrJozI_X4m_certs.zip
  	inflating: DigiCertTrustedRoot.pem
  	inflating: secureGatewayCert.pem
  	inflating: DigiCertCA2.pem
  	inflating: cAMkmBrJozI_X4m_cert.pem
  	inflating: cAMkmBrJozI_X4m_key.pem

* At this point, we can create a user-provided service that contains the on-prem app's destination and access information, as well as the certificate and key information in a json file.  For example, if the on-prem app is a database, the json file could look something like:
'{"dbname": "<db name>","dbpw": "<dbpassword>","dbuser": "root","host": "<something.ibmcloud.com>","port": "<port number>","key":"<keyFileContents>", "cert":"<certFileContents>", ...}'

Note that the key and cert information are provided as key value pairs in the json file.  The keyFileContents and certFileContents are stored in the <destination_id>_key.pem and <destination_id>_cert.pem files, respectively.  For example, in our example, here's the contents of the cAMkmBrJozI_X4m_key.pem file:

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

This whole content needs to be copied into the json file.

* Run the cf cups command as follows:

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

The IDS pipeline will consist of the follow stages which will be trigger upon pushing any change to the project:
	1. Integration Tests - runs tests on the NodeJS code
	2. Build - build the container image
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
2. Specify a route so we have a static URL to access our app once deployed
3. Create and add volume storage to the container

In the Deployer script, scroll down until you see the line that calls deploycontainer.sh and comment it out.  This is the script that deploys a single container.  We don't want that.

Scroll down a little further until you see the commented line that would call deploygroup.sh and uncomment it.  This is the script that deploys a container group which is what we want.

The deploygroup.sh script will look for certain environment variables to trigger things such as setting up the route and adding the volume storage.  Go to the Environment Properties tab of the stage and add the following text properties:
	ROUTE_HOSTNAME = medicar-staging
	ROUTE_DOMAIN = mybluemix.net
	OPTIONAL_ARGS = "-v medicarvolume:/data"
The first two properties will be used to setup the route to the app once it is deployed and will result in the app being made available at medicar-staging.mybluemix.net.  The last property will be passed to the ICE command that deploys the container group and will attach the volume storage where files will be persisted across deployments of the app.

Prior to running this stage of the pipeline, be sure to create the volume storage by running the following command.  It only needs to be run once.
	ice volume create medicarvolume

Save the stage.

## Load Test
We'll use JMeter to generate a load on the server to ensure the REST API is working properly.  This will also give us a chance to review the monitoring and logging functionality offered by the Bluemix container service.  By reviewing that, we'll be able to see if container auto-scaling and load balancing is working properly.

The test script we will use is in the project under the tests directory.  You can review it by install JMeter from here: http://jmeter.apache.org and opening the script using JMeter.

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

Copy the follow script into the Test Command section:
	#!/bin/bash
	echo "Installing JMeter..."
	apt-get -y install jmeter
	
	# Pass the location of the test inputs directory within the project to JMeter so 
	# it knows where to find the input files.
	test_inputs="$(pwd)/inputs"
	
	# Run the test
	echo "Running JMeter load test..."
	jmeter -n -JtestInputs=${test_inputs} -t ${test_script} -l ${results_file} -j ${log_file}
	
	# Dump the log and the results into the console
	echo "JMeter log:"
	cat -A ${log_file}
	echo
	echo "Test results:"
	cat -A ${results_file}
	
	# Check for errors and exit accordingly
	errors="$(grep -c .*,.*,.*,.*,.*,.*,.*,false,.*,.* load.jtl)"
	if [ errors ne 0 ]; then
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

