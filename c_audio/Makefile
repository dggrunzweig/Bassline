# List of dependencies to compile
DEPS = ./src/audio.cpp ./src/oscillator.cpp

# BINARYEN_ASYNC_COMPILATION=0 prevents async compiling of the c++ code, ensures linking is done correctly
# WASM=1 ensures wasm is built
# SINGLE_FILE=1 combines wasm module and js wrapper into a single file 
# EXPORTED_FUNCTIONS="['_malloc']" ensures that the malloc function is exported, we need this to handle creating audio buffers that are accessible by the wasm module
# -o ../src/kick-synth-WASM.js output file and location
# --pre-js pre-js.js A pre-js file which adds javascript at the beginning of the outputted js file#
# --post-js post-js.js A post-js file which adds javascript at the beginning of the outputted js file

build: $(DEPS)
	@emcc --bind -O1 \
	  -s BINARYEN_ASYNC_COMPILATION=0 \
	  -s WASM=1 \
	  -s SINGLE_FILE=1 \
	  -s EXPORTED_FUNCTIONS="['_malloc']" \
	  $(DEPS) \
	  -o ../src/audio/kick-synth-WASM.js \
	  --pre-js pre-js.js \
	  --post-js post-js.js 

clean:
	@rm -f ../src/audio/kick-synth-WASM.js

# --no-entry specifies that it should not look for a main() function
# STANDALONE_WASM=1 lets it know that it should only build the wasm file and no supporting js files
build-wasm: $(DEPS)
	@emcc --no-entry --bind -O1 \
	  -s BINARYEN_ASYNC_COMPILATION=0 \
	  -s WASM=1 \
	  -s EXPORTED_FUNCTIONS="['_malloc']" \
	  -s STANDALONE_WASM=1 \
	  $(DEPS) \
	  -o ../src/audio/kick-synth-WASM.wasm

# -s ASSERTIONS=0 turns off assertions
# -O3 is the optimzation level (highest optimization, could you -OS if smaller code size is desired)
# --extern-pre-js and --extern-post-js prevents compilation errors at higher optimization levels due to minification 

release: $(DEPS)
	@emcc --bind -O3 \
	  -s BINARYEN_ASYNC_COMPILATION=0 \
	  -s ASSERTIONS=0 \
	  -s WASM=1 \
	  -s SINGLE_FILE=1 \
	  -s EXPORTED_FUNCTIONS="['_malloc']" \
	  $(DEPS) \
	  -o ../src/audio/kick-synth-WASM.js \
	  --extern-pre-js pre-js.js \
	  --extern-post-js post-js.js 

test-build:
	@cmake -S . -B build_test
	@cmake --build build_test

test-run:
	@cd build_test && ./TEST_SUITE

test-clean:
	@rm -rf build_test/