FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Instalar herramientas de compilación, CMake, GCC, Git y dependencias de PostgreSQL / Crow
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    cmake \
    make \
    pkg-config \
    libpq-dev \
    libpqxx-dev \
    libasio-dev \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Descargar e instalar las cabeceras de Crow C++ Framework
RUN git clone https://github.com/CrowCpp/Crow.git /tmp/crow && \
    cp -r /tmp/crow/include/* /usr/local/include/ && \
    rm -rf /tmp/crow

WORKDIR /app

COPY . .

# Compilar ejecutable
RUN mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc)

# Runtime final ligero
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libpq5 \
    libpqxx-6.4 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/servidor /app/servidor

EXPOSE 18080

CMD ["./servidor"]