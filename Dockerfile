FROM public.ecr.aws/x8v8d7g8/mars-base:latest

WORKDIR /app

ENV NODE_ENV=development
ENV COREPACK_HOME=/opt/.corepack
ENV YARN_CACHE_FOLDER=/opt/.yarn-cache
ENV npm_config_cache=/opt/.npm
ENV HOME=/tmp

RUN mkdir -p /opt/.corepack /opt/.yarn-cache /opt/.npm && chmod -R a+rwx /opt/.corepack /opt/.yarn-cache /opt/.npm

COPY . .

RUN yarn install && chmod -R a+rX /app && chmod -R a+rwx /tmp

CMD ["/bin/bash"]
