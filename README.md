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
    ice route map --hostname medicalrecordslocal --domain mybluemix.net medicalrecordslocal


## On Premise repository

The on premise data store is being accessed through the secure gateway service.
Using the bluemix UI create the secure gateway service.

* Create the gateway in the service.
* Create the connection in the gateway.  As you will see below the IP address of the computer that is running the records program locally is 158.85.183.50 and the port will be 8080

On premise:
* Follow the instructions to docker run the secure gateway docker image connecting back to the gateway above.  For me this was: docker run -d ibmcom/secure-gateway-client KhNfR9WOC8l_prod_ng
* Run the on premise records app.  For me this was:  docker run -d -p 8080:80 registry-ice.ng.bluemix.net/acme/medicalrecordslocal
* Do an ifconfig and verify that the IP address configured in the gateway, above, is correct.  For me ifconfig displayed the following so I'm good to go

    eth1      Link encap:Ethernet  HWaddr 06:9f:f1:b6:50:cc
              inet addr:158.85.183.50  Bcast:158.85.183.63  Mask:255.255.255.224

On the computer that is running the secure gateway docker image I verified the following command returned some stuff from the records app.

    # curl 158.85.183.50:8080

On any computer on the planet I could verify that the sg connection is working correctly.  In the bluemix ui open the info on the connection (you will find the connection within gateway which is in the secure gateway service).  For me the Cloud Host:Port was cap-sg-prd-2.integration.ibmcloud.com:15188

    $ curl cap-sg-prd-2.integration.ibmcloud.com:15188
