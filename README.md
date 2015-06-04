# Workload - data scale out

June 2015 MVF defined [Workload Requirements](https://releaseblueprints.ibm.com/display/IDC/Workload+Requirements)
VM's were not in plan for June so containers were substituted.  Autoscaling was replaced by groups.

## Big Picture

[Block Diagram](diagram.png)


* [bluemix cfsworkloads](https://console.ng.bluemix.net/?direct=classic#/resources/orgGuid=b163c0f6-6d12-419b-b3d3-0c105e2294c7&spaceGuid=e2e09bbf-ff0e-488e-b19a-200565d173b6)
* [source code](https://hub.jazz.net/project/referenceapps/workloads)


# Running Locally

* install node and npm on your computer (note that node is required not nodejs)
* clone this project
* cd node
* npm install
* npm start
* the /data directory on your computer will need to be writeable 
* check out bin/www.js it will indicate what the port# is.  Currently it is http:localhost:80.  You can visit this in a browser.  See the curl examples below.

# test suite

The test suite is run with mocha.

    npm install -g mocha
    npm test

# API
Example curl from swift docs using cygwin.  -T upload a file.  -i include header information in the output. -X request command. -F form.  For a form it must have one file and one optional field whose value is the real storage filename.  A get at the volume will retrieve a list of all the files.

    curl -v -i -T /cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt localhost:3000/api/vol/public/a.txt -X PUT
    curl -v localhost:3000/api/vol/public/
    curl -v localhost:3000/api/vol/public/a.txt -X GET
    curl -v localhost:3000/api/vol/public/a.txt -X DELETE
    curl -v -i -F "f=@/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt" localhost:3000/api/vol/public/form -X POST
    curl -v -i -F "f=@/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt" -F "g=b.txt" localhost:3000/api/vol/public/form -X POST

Object storage swap the vol -> obj

    curl -v -i -T /cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt localhost:3000/api/obj/public/a.txt -X PUT
    curl -v localhost:3000/api/obj/public/
    curl -v localhost:3000/api/obj/public/a.txt -X GET
    curl -v localhost:3000/api/obj/public/a.txt -X DELETE
    curl -v -i -F "f=@/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt" localhost:3000/api/obj/public/form -X POST
    curl -v -i -F "f=@/cygdrive/c/Users/IBM_ADMIN/Downloads/a.txt" -F "g=b.txt" localhost:3000/api/obj/public/form -X POST
    curl -v localhost:3000/api/obj/public/a.txtx -X DELETE

Similarly it is possible to read from the on premise: chage **vol** to **premise**
