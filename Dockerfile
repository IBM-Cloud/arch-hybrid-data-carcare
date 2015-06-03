FROM registry-ice.ng.bluemix.net/ibmnode:latest

# Install tooling
RUN apt-get -y update && apt-get -y install curl git-core

# Fetch the source code
RUN rm -rf /src && mkdir /src
RUN git clone https://hub.jazz.net/git/cfsworkload/medicalrecords /src/medicalrecords --branch master --single-branch

# Install dependencies
WORKDIR /src/medicalrecords/node
RUN npm install

EXPOSE 80
CMD ["npm", "start"]
