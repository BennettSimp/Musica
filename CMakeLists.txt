cmake_minimum_required(VERSION 3.18)
project(sys_musica_backend CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(PkgConfig REQUIRED)
pkg_check_modules(PQXX REQUIRED libpqxx)

add_executable(servidor main.cpp)

target_include_directories(servidor PRIVATE ${PQXX_INCLUDE_DIRS})
target_link_libraries(servidor PRIVATE ${PQXX_LIBRARIES})