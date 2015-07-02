FROM registry.ng.bluemix.net/ibmnode:latest

# Install tooling
RUN apt-get update && apt-get -y install curl

# Fetch the source code
RUN rm -rf /src && mkdir /src
COPY . /src/medicar

# Install dependencies
WORKDIR /src/medicar/node
RUN npm install

EXPOSE 80
CMD ["npm", "start"]
