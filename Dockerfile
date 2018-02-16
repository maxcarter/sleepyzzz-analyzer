# docker build -t sleepyzzz-analyzer .
# docker run -d -p 80:80 sleepyzzz-analyzer
# docker ps -a
# docker exec -it <container id> bash

# To stop: docker stop <container id>
# To remove: docker rm <container id>

# To list images: docker images -a
# To delete images: docker rmi <ImageId>

FROM ubuntu
RUN apt-get update
RUN apt-get -y install apt-utils curl

# Install node.js and pm2
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get -y install nodejs
RUN npm install pm2 -g
ADD deploy/ecosystem.config.js /
RUN mkdir /var/www/production

# Build Backend
ADD . /var/www/production/sleepyzzz-analyzer
RUN rm /var/www/production/sleepyzzz-analyzer/Dockerfile
RUN rm -rf /var/www/production/sleepyzzz-analyzer/deploy
RUN rm -rf /var/www/production/sleepyzzz-analyzer/.git
RUN cd /var/www/production/sleepyzzz-analyzer && npm install

CMD pm2 start ecosystem.config.js && pm2 logs
