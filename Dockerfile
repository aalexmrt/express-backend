# Base Image
FROM node:20.18.0-alpine

# add dependencies for puppeteer
RUN apk add --no-cache \
    udev \
    ttf-freefont \
    chromium
    
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser


WORKDIR /usr/app
# install dependencies
COPY ./package.json ./
RUN npm install
COPY ./ ./

EXPOSE 3001

# Default command
CMD ["npm", "start"]