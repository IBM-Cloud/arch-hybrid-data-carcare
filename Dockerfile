FROM registry-ice.ng.bluemix.net/ibmnode:latest

# Enable Bluemix Monitoring & Logging
RUN apt-get update && apt-get -y install apt-transport-https ntp

RUN cd /etc/apt/trusted.gpg.d
RUN wget https://logmet.opvis.bluemix.net:5443/apt/BM_OpVis_repo.gpg
RUN echo "deb https://logmet.opvis.bluemix.net:5443/apt stable main" > /etc/apt/sources.list.d/BM_opvis_repo.list
RUN apt-get update && apt-get -y --allow-unauthenticated install mt-logstash-forwarder

COPY mt-logstash-forwarder.conf /etc/supervisor/conf.d/mt-logstash-forwarder.conf
COPY ibmnode.conf /etc/mt-logstash-forwarder/conf.d/ibmnode.conf

# Install tooling
RUN apt-get update && apt-get -y install curl

# Fetch the source code
RUN rm -rf /src && mkdir /src
COPY . /src/medicalrecords

# Install dependencies
WORKDIR /src/medicalrecords/node
RUN npm install

EXPOSE 80
CMD ["npm", "start"]
