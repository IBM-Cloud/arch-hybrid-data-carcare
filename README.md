# Workload - data scale out

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

Similarly it is possible to read from the on premise: chage **vol** to **premise**

## Docker Image
Create and run the docker image using the docker file:

    $ docker build -t medicalrecordslocal .
    $ mkdir data && chmod 777 data
    $ docker run -d -p 80:80 -v $( pwd )/data:/data medicalrecordslocal
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
    docker tag medicalrecordslocal registry-ice.ng.bluemix.net/acme/medicalrecordslocal
    docker push registry-ice.ng.bluemix.net/acme/medicalrecordslocal
    ice run -p 80 --name medicalrecordslocal acme/medicalrecordslocal
    ice ip request
    ice ip bind 129.41.232.130 medicalrecordslocal
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

    ice volume create medicalrecordsvolume
    ice run -v medicalrecordsvolume:/data -p 80 --name medicalrecordslocal acme/medicalrecordslocal
    ice ip bind 129.41.232.130 medicalrecordslocal

now the curl commands can be used to exercise the *vol* portion of the api and it will be persisted in the volume created:


    curl -i -T $file $host/api/vol/public/a.txt -X PUT
    curl $host/api/vol/public/

Repeat the steps above to ps, stop, rm, run, ip bind and verify the file is still available:


    ice ps
    ice stop 3850564c-7b1c-4596-a005-224a543bece5
    ice rm 3850564c-7b1c-4596-a005-224a543bece5
    ice run -v medicalrecordsvolume:/data -p 80 --name medicalrecordslocal acme/medicalrecordslocal
    ice ip bind 129.41.232.130 medicalrecordslocal
    curl $host/api/vol/public/

Great, curl is returning a table of contents that indicates the file is present.

## Container Groups

    ice group create -v medicalrecordsvolume:/data -p 80 --name medicalrecordslocal acme/medicalrecordslocal
    ice ip bind 129.41.232.130 medicalrecordslocal

### Current State of Bluemix - 6/4/2015

Containers:

* Container service does not work reliably.  ice commands fail for example.
* Not possible to attach to a bluemix container.  This makes debugging painful.
* ice commands return before they complete.  For example the run command finishes before the routes are ready.  What are the best practices in the development pipeline for testing?
* Container service is very slow.
* Can not bind a service to a container
* I could not find the static url for a container like: medicalrecords.mybluemix.net
* Docker is a fun experience on my computer or digital ocean.  Bluemix is frustrating.

Container Group:

* Could not figure out how to bind an ip to the cg
* verbs in the command do not match docker.  list instead of ps for example
* can the container group be a command line switch in the upcoming docker CLI?

Logging

* No instructions of the logging enablement for Docker.
* Any reason not to include logging in the IBM supplied docker images?
* Some of the docker requirements are not available in public repos available to docker build.
* Advanced views do not work
* The logging and monitoring service goes up and down in the GUI

Build pipeline:

* What are in the images that are used for the test stages?  For example is node, jre, ... in them?
* It is my job to install the software that is required?  Could I install things that would conflict with predefined requirements?
* Could the stages be docker files or images supplied by my organization?
* Why isn't the pipeline persisted in a file.  I want to keep this under source control.  I want to edit/copy/paste/clone.

SSO Service

* Very complicated. The free alternative is easy to configure and use.
* Node code is not available in public npm repository.
* More details coming next week

Object Storage v2 Service

* There is no documentation that explains the bluemix unique part of the API.
* Is not possible to bind to the service normally for some orgs (including mine).

Volumes

* Straight forward to create and use in the CLI
* Can not find size limits, current amount used, or information in the bluemix dashboard.
* Can not determine $ cost

All Services providing programmatic value (like SSO, Logging, Object Storage, ...)

* Must provide development documentation for on premise use in a traditional desktop env.
* SSO and Object Storage have this capability but no documenttion was provided.
