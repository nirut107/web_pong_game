FROM debian:bullseye-slim

# Check out
# https://hub.docker.com/layers/library/debian/bullseye-slim/images/sha256-df172d92d287ec4d4a538e5db8026fcde5f91f5f90061423d69d6148ff05cc47

RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80retries

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    git \
    libpcre3 \
    libpcre3-dev \
    libpcre2-8-0 \
    libpcre2-dev \
    zlib1g \
    zlib1g-dev \
    libssl-dev \
    libgeoip-dev \
    libtool \
    automake \
    pkg-config \
    autoconf \
    libcurl4-openssl-dev \
    libxml2 \
    libxml2-dev \
    libxslt1-dev \
    libyajl-dev \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt

RUN set -e; \
    for i in 1 2 3; do \
        echo "Attempt $i: Cloning ModSecurity"; \
        if git clone --depth 1 -b v3/master --single-branch https://github.com/SpiderLabs/ModSecurity && \
        cd ModSecurity && \
        git submodule init && \
        git submodule update && \
        ./build.sh && \
        ./configure && \
        make -j$(nproc) && \
        make install && \
        cd .. && \
        rm -rf ModSecurity; then \
            echo "ModSecurity installed successfully"; \
            break; \
        else \
            echo "Attempt $i failed!"; \
            if [ $i -lt 3 ]; then \
                echo "Trying again..."; \
                sleep 5; \
                rm -rf ModSecurity; \
            else \
                echo "Failed to install ModSecurity after 3 attempts"; \
                exit 1; \
            fi; \
        fi; \
    done

ENV NGINX_VERSION=1.24.0
RUN set -e; \
    for i in 1 2 3; do \
        echo "Attempt $i: Downloading Nginx"; \
        if wget -q https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
        tar -xzf nginx-${NGINX_VERSION}.tar.gz && \
        rm nginx-${NGINX_VERSION}.tar.gz; then \
            echo "Nginx downloaded successfully"; \
            break; \
        else \
            echo "Attempt $i failed!"; \
            if [ $i -lt 3 ]; then \
                echo "Trying again..."; \
                sleep 5; \
                rm -f nginx-${NGINX_VERSION}.tar.gz; \
            else \
                echo "Failed to download Nginx after 3 attempts"; \
                exit 1; \
            fi; \
        fi; \
    done

# Download ModSecurity-nginx connector with retry mechanism
RUN set -e; \
    for i in 1 2 3; do \
        echo "Attempt $i: Cloning ModSecurity-nginx connector"; \
        if git clone --depth 1 https://github.com/SpiderLabs/ModSecurity-nginx.git; then \
            echo "ModSecurity-nginx connector downloaded successfully"; \
            break; \
        else \
            echo "Attempt $i failed!"; \
            if [ $i -lt 3 ]; then \
                echo "Trying again..."; \
                sleep 5; \
                rm -rf ModSecurity-nginx; \
            else \
                echo "Failed to download ModSecurity-nginx after 3 attempts"; \
                exit 1; \
            fi; \
        fi; \
    done

RUN cd nginx-${NGINX_VERSION} && \
    ./configure \
        --prefix=/usr/share/nginx \
        --sbin-path=/usr/sbin/nginx \
        --modules-path=/usr/lib/nginx/modules \
        --conf-path=/etc/nginx/nginx.conf \
        --error-log-path=/var/log/nginx/error.log \
        --http-log-path=/var/log/nginx/access.log \
        --pid-path=/var/run/nginx.pid \
        --lock-path=/var/run/nginx.lock \
        --http-client-body-temp-path=/var/cache/nginx/client_temp \
        --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
        --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
        --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
        --http-scgi-temp-path=/var/cache/nginx/scgi_temp \
        --with-compat \
        --with-http_ssl_module \
        --with-http_stub_status_module \
        --with-http_realip_module \
        --with-http_auth_request_module \
        --with-http_addition_module \
        --with-http_gzip_static_module \
        --with-http_sub_module \
        --add-dynamic-module=../ModSecurity-nginx && \
    make -j$(nproc) && \
    make install

RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /etc/nginx/modsecurity && \
    mkdir -p /etc/nginx/ssl && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/www/metrics

RUN set -e; \
    for i in 1 2 3; do \
        echo "Attempt $i: Cloning OWASP Core Rule Set"; \
        if git clone --depth 1 https://github.com/coreruleset/coreruleset.git /usr/local/owasp-modsecurity-crs && \
        cd /usr/local/owasp-modsecurity-crs && \
        mv crs-setup.conf.example crs-setup.conf && \
        cd rules && \
        mv REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf && \
        mv RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf.example RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf; then \
            echo "OWASP Core Rule Set installed successfully"; \
            break; \
        else \
            echo "Attempt $i failed!"; \
            if [ $i -lt 3 ]; then \
                echo "Trying again..."; \
                sleep 5; \
                rm -rf /usr/local/owasp-modsecurity-crs; \
            else \
                echo "Failed to install OWASP CRS after 3 attempts"; \
                exit 1; \
            fi; \
        fi; \
    done

# Install nginx-prometheus-exporter
ENV NGINX_EXPORTER_VERSION=0.11.0
RUN set -e; \
    apt-get update && \
    apt-get install -y curl tar && \
    mkdir -p /opt/nginx-prometheus-exporter && \
    cd /opt && \
    curl -LO https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v${NGINX_EXPORTER_VERSION}/nginx-prometheus-exporter_${NGINX_EXPORTER_VERSION}_linux_amd64.tar.gz && \
    tar -xzf nginx-prometheus-exporter_${NGINX_EXPORTER_VERSION}_linux_amd64.tar.gz -C /opt/nginx-prometheus-exporter && \
    chmod +x /opt/nginx-prometheus-exporter/nginx-prometheus-exporter && \
    rm nginx-prometheus-exporter_${NGINX_EXPORTER_VERSION}_linux_amd64.tar.gz && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy ModSecurity and Nginx configurations
COPY modsecurity/modsecurity.conf /etc/nginx/modsecurity/modsecurity.conf
COPY modsecurity/custom-rules.conf /etc/nginx/modsecurity/custom-rules.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY update_metrics.sh /update_metrics.sh
RUN chmod +x /update_metrics.sh

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log && \
    ln -sf /dev/stderr /var/log/nginx/modsec_audit.log

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    curl \
    nano \
    procps \
    supervisor && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set proper permissions
RUN chown -R root:root /var/log/nginx && \
    chown -R root:root /var/cache/nginx && \
    chown -R root:root /etc/nginx/ssl

# Expose ports
EXPOSE 80 443

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 