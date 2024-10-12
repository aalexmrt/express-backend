# Base Image
FROM node:20.18.0-alpine

WORKDIR /usr/app
# install dependencies
COPY ./package.json ./
RUN npm install
COPY ./ ./

EXPOSE 3001

# Default command
CMD ["npm", "start"]