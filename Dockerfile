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
# Pin v1.3.4: corrige CVE-2026-116011 (Crow < 1.3.4). No bajar de aquí.
RUN git clone --depth 1 --branch v1.3.4 https://github.com/CrowCpp/Crow.git /tmp/crow && \
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
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/servidor /app/servidor

# Correr sin privilegios (endurecimiento estándar; no cambia el
# funcionamiento: el servidor solo escucha en el puerto 18080 y hace
# conexiones salientes a la base).
RUN groupadd -r app && useradd -r -g app app
USER app

EXPOSE 18080

# Salud del servidor + base de datos: /api/salud/db devuelve 200 solo si
# la DB responde (503 si está caída). El puerto es $PORT o 18080 por
# defecto (ver main.cpp).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-18080}/api/salud/db" || exit 1

CMD ["./servidor"]