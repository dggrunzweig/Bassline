cmake_minimum_required(VERSION 3.14)
project(SUBSTRATA_WASM)

# GoogleTest requires at least C++14
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)


include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

set(TESTS
    ./src/audio_utils_test.cpp
)

enable_testing()
add_executable(TEST_SUITE ${TESTS})
target_link_libraries(TEST_SUITE GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(TEST_SUITE)