FROM registry-ice.ng.bluemix.net/ibmnode:latest

# Install tooling
RUN apt-get -y update && apt-get -y curl git-core
#RUN curl -sL https://deb.nodesource.com/setup | sudo bash -
#RUN apt-get install -y nodejs

# Fetch the source code
RUN rm -rf /src && mkdir /src
RUN git clone https://hub.jazz.net/git/cfsworkload/medicalrecords /src/medicalrecords --branch develop --single-branch

# Install dependencies
COPY . /src
RUN cd /src/medicalrecords/node; npm install

EXPOSE 3000
CMD ["npm", "start"]
