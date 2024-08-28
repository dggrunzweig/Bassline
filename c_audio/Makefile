# List of dependencies to compile
DEPS = ./src/audio.cpp ./src/oscillator.cpp

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

test-build:
	@cmake -S . -B build_test
	@cmake --build build_test

test-run:
	@cd build_test && ./TEST_SUITE

test-clean:
	@rm -rf build_test/