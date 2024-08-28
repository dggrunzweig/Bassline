### Setup

Requires the install of Emscripten compiler

`brew install emscripten`

To compile the audio file

`cd WASM`
`make build`

Optimization Levels

`-O0` None
`-O1` Slight Optimization
`-O2` Medium Optimization
`-O3` Max, Good For Release Builds

For Testing

`cd WASM`
`make test-build`
`make test-run`
