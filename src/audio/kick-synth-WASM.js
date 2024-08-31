// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // `require()` is no-op in an ESM module, use `createRequire()` to construct
  // the require()` function.  This is only necessary for multi-environment
  // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
  // TODO: Swap all `require()`'s with `import()`'s?

}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: /Users/davidg/Documents/GitHub/Substrata/c_audio/pre-js.js
import { Buffer } from 'buffer';

const atob = (a) => {
    return Buffer.from(a, 'base64').toString('binary');
};
// end include: /Users/davidg/Documents/GitHub/Substrata/c_audio/pre-js.js


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');
  var nodePath = require('path');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs. Normalizing isn't
  // necessary in that case, the path should already be absolute.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  var ret = fs.readFileSync(filename);
  return ret;
};

readAsync = (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  return new Promise((resolve, reject) => {
    fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(binary ? data.buffer : data);
    });
  });
};
// end include: node_shell_read.js
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  process.on('uncaughtException', (ex) => {
    // suppress ExitStatus exceptions from showing an error
    if (ex !== 'unwind' && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
      throw ex;
    }
  });

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith('blob:')) {
    scriptDirectory = '';
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/')+1);
  }

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((reject, resolve) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    return fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (response.ok) {
          return response.arrayBuffer();
        }
        return Promise.reject(new Error(response.status + ' : ' + response.url));
      })
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];

if (Module['thisProgram']) thisProgram = Module['thisProgram'];

if (Module['quit']) quit_ = Module['quit'];

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary; 
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];

// include: base64Utils.js
// Converts a string of base64 into a byte array (Uint8Array).
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE != 'undefined' && ENVIRONMENT_IS_NODE) {
    var buf = Buffer.from(s, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }

  var decoded = atob(s);
  var bytes = new Uint8Array(decoded.length);
  for (var i = 0 ; i < decoded.length ; ++i) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}
// end include: base64Utils.js
// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    // This build was created without ASSERTIONS defined.  `assert()` should not
    // ever be called in this configuration but in case there are callers in
    // the wild leave this simple abort() implementation here for now.
    abort(text);
  }
}

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
}
// end include: runtime_shared.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
// include: runtime_assertions.js
// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;

  
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  Module['monitorRunDependencies']?.(runDependencies);

}

function removeRunDependency(id) {
  runDependencies--;

  Module['monitorRunDependencies']?.(runDependencies);

  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  what += '. Build with -sASSERTIONS for more info.';

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');
// end include: URIUtils.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
function findWasmBinary() {
    var f = 'data:application/octet-stream;base64,AGFzbQEAAAAB8wEiYAF/AX9gAX8AYAR/f39/AGACf38AYAAAYAN/f38AYAJ/fwF/YAN/f38Bf2AGf39/f39/AGAFf39/f38AYAN/fX8AYAABf2ACfX0BfWABfQF/YAF9AX1gAn99AGADf319AGAFf39/f38Bf2ABfwF9YAZ/f39/f38Bf2ANf39/f39/f39/f39/fwBgCX9/f39/f39/fwBgCn99fX19fX19fX0BfWADf399AGAEf399fwBgBH9/fX0AYAN/fX0BfWAFf319f38BfWACf30BfWABfwF8YAJ8fwF9YAR/f39/AX9gBX9/f35+AGAHf39/f39/fwAC4QMQA2Vudg1fX2Fzc2VydF9mYWlsAAIDZW52Fl9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MAFANlbnYiX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3RvcgAIA2Vudh9fZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uABUDZW52FV9lbWJpbmRfcmVnaXN0ZXJfdm9pZAADA2VudhVfZW1iaW5kX3JlZ2lzdGVyX2Jvb2wAAgNlbnYYX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyAAkDZW52Fl9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQABQNlbnYbX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nAAMDZW52HF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcABQNlbnYWX2VtYmluZF9yZWdpc3Rlcl9lbXZhbAABA2VudhxfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3AAUDZW52FV9lbXNjcmlwdGVuX21lbWNweV9qcwAFA2VudhZlbXNjcmlwdGVuX3Jlc2l6ZV9oZWFwAAADZW52CV9hYm9ydF9qcwAEA2VudhdfZW1iaW5kX3JlZ2lzdGVyX2JpZ2ludAAhA4ABfwQAAQQEBgIWAQEPBQoKCgoKEAMDAQEDABEABAABBgAJAwAGFwIYGQUFBQAGAAAGBAYaGwcHDA0MDQwNDhwOEhIMAAAOHR4AAAsLAAAHAQAABAABAwEEBAALBgABAQEBAQEHBwAHHwMTERMCAgIHBwYGCQIJCQgIAAABCwEACyAEBQFwATk5BQYBAYICggIGDQJ/AUGg0gQLfwFBAAsHywEKBm1lbW9yeQIAEV9fd2FzbV9jYWxsX2N0b3JzABANX19nZXRUeXBlTmFtZQARGV9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUBAAZtYWxsb2MAWwRmcmVlAF0ZX2Vtc2NyaXB0ZW5fc3RhY2tfcmVzdG9yZQCLARdfZW1zY3JpcHRlbl9zdGFja19hbGxvYwCMARxlbXNjcmlwdGVuX3N0YWNrX2dldF9jdXJyZW50AI0BFV9fY3hhX2lzX3BvaW50ZXJfdHlwZQCHAQlCAQBBAQs4EyssLS4WLxgwGTEyGjMbNBw1HR4fICE2IjcjOCQlJjk6Ozw9PicpKmpta2xxbnSGAYQBe2+FAYMBfHB+CoqYAX8GABAUED8LCQAgACgCBBBWCxUAIABBACgCjE42AgRBACAANgKMTgvzAwBBlMsAQZwMEARBrMsAQdAKQQFBABAFQbjLAEHXCUEBQYB/Qf8AEAZB0MsAQdAJQQFBgH9B/wAQBkHEywBBzglBAUEAQf8BEAZB3MsAQcAIQQJBgIB+Qf//ARAGQejLAEG3CEECQQBB//8DEAZB9MsAQdUIQQRBgICAgHhB/////wcQBkGAzABBzAhBBEEAQX8QBkGMzABB+gpBBEGAgICAeEH/////BxAGQZjMAEHxCkEEQQBBfxAGQaTMAEHvCEEIQoCAgICAgICAgH9C////////////ABCOAUGwzABB7ghBCEIAQn8QjgFBvMwAQegIQQQQB0HIzABBjQxBCBAHQeAZQYwLEAhBqBpB6hAQCEHwGkEEQf8KEAlBvBtBAkGYCxAJQYgcQQRBpwsQCUGkHBAKQcwcQQBBpRAQC0H0HEEAQYsREAtBnB1BAUHDEBALQcQdQQJB8gwQC0HsHUEDQZENEAtBlB5BBEG5DRALQbweQQVB1g0QC0HkHkEEQbAREAtBjB9BBUHOERALQfQcQQBBvA4QC0GcHUEBQZsOEAtBxB1BAkH+DhALQewdQQNB3A4QC0GUHkEEQYQQEAtBvB5BBUHiDxALQbQfQQhBwQ8QC0HcH0EJQZ8PEAtBhCBBBkH8DRALQawgQQdB9REQCwsqAEEAQQE2ApBOQQBBADYClE4QE0EAQQAoAoxONgKUTkEAQZDOADYCjE4L9wQBBn8gAEIANwKYDyAAQagPakIANwIAIABCADcCuAwgAEEAOwGYDCAAQQA2ApQIIABBADoAkAggAEEANgKMBCAAQQA6AIgEIABBADYCBCAAQQA6AAAgAEIANwKcDCAAQoCAgICAATcCwAwgAEGkDGpCADcCACAAQawMakIANwIAIABBgICA/AM2ApwPIABBoA9qQgA3AgAgAEG0D2oiAkIANwIAIABBvA9qIgNCADcCACAAQcQPaiIEQQA2AgAgAEIANwKsDyADQQA2AgAgAkKAgID8AzcCACAAQQA2AtgPIARCADcCACAAQcwPakIANwIAIABB0w9qQQA2AABBABBhIQIgAEIANwLgDyAAIAI2AtwPIABB6A9qQgA3AgAgAEHwD2pCADcCAAJAIAFFDQAgACABEEAaIABBiARqIAEQQBogAEGQCGogARBAGiAAQgA3AsgMIAAgATYCtAwgAEHQDGpCADcCACAAQdgOaiEDIABBmA5qIQQgAEHYDWohBSAAQZgNaiEGIABB2AxqIQdBACEBA0AgByABIgJBAnQiAWpBgICgkgQ2AgAgBiABakGAgID8AzYCACAFIAFqQc2Zs+4DNgIAIAQgAWpBgICA/AM2AgAgAyABakEANgIAIAJBAWoiAiEBIAJBEEcNAAsgAEEANgL0DyAAQs2Zs+4DNwLsDyAAQoCAoJIENwLkDyAAQu+kjNTjwJi+wgA3ApgPIABCgICAgICAgJDBADcCsA8gAEEANgKsDyAAQu+kjNTzzcTBOjcCoA8gAEEANgLEDyAAQgA3ArgPIABBgAQQYTYC4A8gAA8LQZ0SQZsKQQtB1QoQAAAL5wcCCn8GfQJAIAAtAJgMDQAgAUEAIAIgA2xBAnQQRBoPCwJAAkAgAg0AQQAhBAwBC0QAAAAAAADwPyAAKAK0DLijtiEOIABB2A5qIQUgAEGYDmohBiAAQdgNaiEHIABBmA1qIQggAEHYDGohCSAAQcgMaiEKQQAhC0EAIQwDQCAMIQwgCyELAkACQCAALQCZDEEBRw0AIAAoAqgMQQVLIQ0MAQsgACoCpAwgACoCsAyTIAAqArwMXiENCwJAAkAgDQ0AIAshCwwBCwJAAkAgCiAAKALADCINai0AAEEBRg0AIAshCwwBCyAAQQA2AqwMIABBADYCpAwgACAJIA1BAnQiBGoqAgA4AuQPIABDAAAgQSAIIARqKgIAQwAAgEGUQwAAgMGSQwAAoEGVEFA4AugPIAAgByAEaioCACAAKgK8DJQ4AuwPIAAgBiAEaioCADgC8A8gAEMAACBBIAUgBGoqAgBDAAAQQpRDAADAwZJDAACgQZUQUDgC9A8CQCANRQ0AIAshCwwBCyALIQsgAC0A1A9BAXFFDQAgAEEBOgDVDyAMIQsLIABBADYCqAwgACAAKgKkDDgCsAwgACANQQFqIAAoAsQMbzYCwAwgCyELCyALIQsgACAAKgKgDyIPIAAqAqgPIhCSOAKgDyAAIAAqArgPIhEgACoCwA8iEpI4ArgPAkACQCAAKAKsD0F/arJDAAAAABBFIhOLQwAAAE9dRQ0AIBOoIQ0MAQtBgICAgHghDQsgACANIg02AqwPAkACQCAAKALED0F/arJDAAAAABBFIhOLQwAAAE9dRQ0AIBOoIQQMAQtBgICAgHghBAsgACAEIgQ2AsQPIAAgECANskMAAIA/lpQ4AqgPIAAgEiAEskMAAIA/lpQ4AsAPIAAgACoCpAwgACoCrAwgACoC5A8gACoC6A8gACoC7A8gACoC8A8gACoC9A8gDyAREBchDyAAKALgDyAMQQJ0aiAPOAIAIAAgACoCpAwgDpI4AqQMIAshBCALIQsgDEEBaiINIQwgDSACRw0ACwsgBCEEAkAgA0UNACACQQJ0IQ1BACEMA0AgASAMIgwgAmxBAnRqIAAoAuAPIA0QQxogDEEBaiILIQwgCyADRw0ACwsCQCAALQDVD0UNACAAKALgDyAEQQJ0aiELIAAoAtgPIAAoAtAPQQJ0aiENAkAgACgCyA8iAyACIARrIgxNDQAgDSALIAxBAnQQQxogACAAKALIDyAMazYCyA8gACAAKALQDyAMajYC0A8PCyANIAsgA0ECdBBDGiAAQQE6ANYPIABBADsB1A8gAEEANgLQDyAAQQA2AsgPCwv3AgIBfwF9IwBBEGsiCiQAAkACQCAFQwAAAABeRQ0AIAEgApNDF7fROJVDAACAPxBHQwAAAAAQRSELIABDAACAPyABIAJDF7fROJKTIgEgBZVDAACAPxBHQwAAAAAQRZMiAiACIAsgCyAElJSUlCAAKgKcDCICk0PNzMw9lCACkjgCnAwgBUMAAIA+lCIFQwAAAABeRQ0BIABDAACAPyABIAWVQwAAgD8QR0MAAAAAEEWTIgUgBSALIAsgA0MAAEBBlCAGlJSUlJQgACoCoAwiC5NDzczMPZQgC5IiCzgCoAwgAEGIBGogA7tEH4XrUbge8T+itkMAAAAAEEEhBSAAQZAIaiADIAmUQwAAAAAQQSECIApBCGpBACgCvCA2AgAgCkEAKQK0IDcDACAAKgKcDCEBIAAgCyADkiAHIAWUIAIgCJSSIApBAxBCIQsgCkEQaiQAIAEgC5QPC0G5GEHcCUEpQZkIEAAAC0G5GEHcCUEpQZkIEAAACyYAIABBADYCpAwgAEEBOgCYDCAAQQA2AsAMIABCgICA/As3AqwMCwoAIABBADoAmAwLSQACQCABQwAAAABeDQBBlRJBmwpB9gBB1wwQAAALIAAgAUMAAJZDEEdDAAAgQpciATgCuAwgAEMAAHBCIAFDAACAQJSVOAK8DAspAAJAIAJBEEkNAEH/CEGbCkGOAUG2CxAAAAsgACACakHIDGogAToAAAtiAAJAAkAgAkEQTw0AIAFDAACgQWBFDQEgAUMAQJxFX0UNASAAIAJBAnRqQdgMaiABQwBAnEUQR0MAAKBBlzgCAA8LQf8IQZsKQZMBQYwIEAAAC0HwF0GbCkGVAUGMCBAAAAtjAAJAAkAgAkEQTw0AIAFDAAAAAGBFDQEgAUMAAIA/X0UNASAAIAJBAnRqQZgNaiABQwAAgD8QR0MAAAAAEEU4AgAPC0H/CEGbCkGaAUGACBAAAAtBkBVBmwpBmwFBgAgQAAALaAACQAJAIAJBEE8NACABQwAAAABgRQ0BIAFDAACAP19FDQEgACACQQJ0akHYDWogAUMAAIA/EEdDF7fROJdDAADAQJQ4AgAPC0H/CEGbCkGgAUHEChAAAAtB0BVBmwpBoQFBxAoQAAALYwACQAJAIAJBEE8NACABQwAAAABgRQ0BIAFDAACAP19FDQEgACACQQJ0akGYDmogAUMAAIA/EEdDAAAAABBFOAIADwtB/whBmwpBpgFBlAwQAAALQcwWQZsKQacBQZQMEAAAC2MAAkACQCACQRBPDQAgAUMAAAAAYEUNASABQwAAgD9fRQ0BIAAgAkECdGpB2A5qIAFDAACAPxBHQwAAAAAQRTgCAA8LQf8IQZsKQawBQYAMEAAAC0GQFkGbCkGtAUGADBAAAAuQAgACQAJAAkACQCACQwAAAABgRQ0AIAJDAAAgQV9FDQAgAUMAAHDCYEUNASABQwAAEEJfRQ0BIAAqApgPQwAAIEEgAUMAAKBBlRBQIgFfRQ0CIAAqApwPIAFgRQ0CIAAgATgCpA8gAEGAATYCrA8gACABIAAqAqAPk0MAAAA8lDgCqA8gACoCsA8gAkMAACBBEEdDAAAAABBFIgJfRQ0DIAAqArQPIAJgRQ0DIAAgAjgCvA8gAEGAATYCxA8gACACIAAqArgPk0MAAAA8lDgCwA8PC0GIF0GbCkGzAUHeDBAAAAtBuBRBmwpBtQFB3gwQAAALQbAMQfIJQR9B3QsQAAALQbAMQfIJQR9B3QsQAAALJgACQCABQX9qQRBJDQBBrRJBmwpBvgFB3woQAAALIAAgATYCxAwLCgAgACABOgCZDAsRACAAIAAoAqgMQQFqNgKoDAsKACAAQQA2AqgMC6wBAgF9AX8gAEEANgLQDwJAAkAgACoCvAwgACgCtAyzlCAAKALEDCABbLOUIgJDAACAT10gAkMAAAAAYHFFDQAgAqkhAQwBC0EAIQELIAAgASIBNgLIDyAAIAE2AswPAkAgACgC2A8iAUUNACABEGQLIABBfyAAKALIDyIBQQJ0IgMgAUH/////A0sbEGEiATYC2A8gAUEAIAMQRBogAEEAOgDWDyAAQQE7AdQPCzwAAkAgAC0A1g9BAUcNACAAQdwPaiAAKALYD0EBIAAoAswPIAAoArQMECgPC0GOFEGbCkH1AUGiCBAAAAvkAgIGfwF9IAJBAXQhBSADIAJsIgZBAXQiB0EkaiEIIAdBLGohAyACIARsQQF0Qf7///8BcSEJAkAgACgCACIKRQ0AIAoQZAsgACADEGEiAzYCACADIAc2ACggA0HkwtGLBjYAJCADQRA7ACIgAyAFOwAgIAMgCTYAHCADIAQ2ABggAyACOwAWIANBATsAFCADQRA2ABAgA0LXgtmq5KybuiA3AAggAyAINgAEIANB0pKZsgQ2AAACQCAGRQ0AIANBLGohA0EAIQIDQCADIQQCQAJAIAEgAiIIQQJ0aioCAEMAAIA/EEdDAACAv5dDAAAAR5SOIguLQwAAAE9dRQ0AQQAhAyALqCECDAELQQAhA0GAgICAeCECCyAEIQQDQCAEIgQgAiICOgAAIAMiB0EBaiEDIALBQQh1IQIgBEEBaiIFIQQgB0UNAAsgBSEDIAhBAWoiBCECIAQgBkcNAAsLIAAoAgALDgAgACgCzA9BAXRBLGoL1QcBAX9BzCBB4CBBgCFBAEGQIUECQZMhQQBBkyFBAEHVCkGVIUEDEAFBzCBBAkGYIUGgIUEEQQUQAkEIEF4iAEEANgIEIABBBjYCAEHMIEH3CEEFQbAhQcQhQQcgAEEAQQAQA0EIEF4iAEEANgIEIABBCDYCAEHMIEHGCEECQcwhQdQhQQkgAEEAQQAQA0EIEF4iAEEANgIEIABBCjYCAEHMIEGrCkECQcwhQdQhQQkgAEEAQQAQA0EIEF4iAEEANgIEIABBCzYCAEHMIEGwCkECQdghQeAhQQwgAEEAQQAQA0EIEF4iAEEANgIEIABBDTYCAEHMIEHXDEEDQeQhQfAhQQ4gAEEAQQAQA0EIEF4iAEEANgIEIABBDzYCAEHMIEG2C0EEQYAiQZAiQRAgAEEAQQAQA0EIEF4iAEEANgIEIABBETYCAEHMIEGMCEEEQaAiQbAiQRIgAEEAQQAQA0EIEF4iAEEANgIEIABBEzYCAEHMIEGACEEEQaAiQbAiQRIgAEEAQQAQA0EIEF4iAEEANgIEIABBFDYCAEHMIEHECkEEQaAiQbAiQRIgAEEAQQAQA0EIEF4iAEEANgIEIABBFTYCAEHMIEGUDEEEQaAiQbAiQRIgAEEAQQAQA0EIEF4iAEEANgIEIABBFjYCAEHMIEGADEEEQaAiQbAiQRIgAEEAQQAQA0EIEF4iAEEANgIEIABBFzYCAEHMIEHeDEEEQcAiQdAiQRggAEEAQQAQA0EIEF4iAEEANgIEIABBGTYCAEHMIEHfCkEDQdgiQeQiQRogAEEAQQAQA0EIEF4iAEEANgIEIABBGzYCAEHMIEHqDEEDQewiQeQiQRwgAEEAQQAQA0EIEF4iAEEANgIEIABBHTYCAEHMIEHxC0ECQcwhQdQhQQkgAEEAQQAQA0EIEF4iAEEANgIEIABBHjYCAEHMIEHZCEECQcwhQdQhQQkgAEEAQQAQA0EIEF4iAEEANgIEIABBHzYCAEHMIEG4CkEDQfgiQeQiQSAgAEEAQQAQA0EIEF4iAEEANgIEIABBITYCAEHMIEGhDEECQYQjQeAhQSIgAEEAQQAQA0EIEF4iAEEANgIEIABBIzYCAEHMIEHJC0ECQdghQeAhQQwgAEEAQQAQA0EIEF4iAEEANgIEIABBJDYCAEHMIEG+CUECQYwjQZQjQSUgAEEAQQAQA0EIEF4iAEEANgIEIABBJjYCAEHMIEGiCEECQYwjQZQjQSUgAEEAQQAQA0EIEF4iAEEANgIEIABBJzYCAEHMIEGdCUECQdghQeAhQQwgAEEAQQAQAwsFAEHMIAtJAQF/AkAgAEUNAAJAIAAoAtgPIgFFDQAgARBkCwJAIAAoAuAPIgFFDQAgARBkCwJAIAAoAtwPIgFFDQAgARBkCyAAQfgPEGMLCykBAX8jAEEQayICJAAgAiABNgIMIAJBDGogABEAACEBIAJBEGokACABCw4AQfgPEF4gACgCABAVC0gBAX8gASAAKAIEIgVBAXVqIQEgACgCACEAAkACQCAFQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiADIAQgABECAAtCAQF/IAEgACgCBCICQQF1aiEBIAAoAgAhAAJAAkAgAkEBcUUNACABKAIAIABqKAIAIQAMAQsgACEACyABIAARAQALCAAgACgCwAwLQgEBfyABIAAoAgQiAkEBdWohASAAKAIAIQACQAJAIAJBAXFFDQAgASgCACAAaigCACEADAELIAAhAAsgASAAEQAAC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQ8AC0YBAX8gASAAKAIEIgRBAXVqIQEgACgCACEAAkACQCAEQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiADIAARBQALRgEBfyABIAAoAgQiBEEBdWohASAAKAIAIQACQAJAIARBAXFFDQAgASgCACAAaigCACEADAELIAAhAAsgASACIAMgABEKAAtGAQF/IAEgACgCBCIEQQF1aiEBIAAoAgAhAAJAAkAgBEEBcUUNACABKAIAIABqKAIAIQAMAQsgACEACyABIAIgAyAAERAAC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQMAC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQMAC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQMACwgAIAAtANYPC0IBAX8gASAAKAIEIgJBAXVqIQEgACgCACEAAkACQCACQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgABEAAAsIACAAKALMDwsIACAAKALYDwtCAQF/IAEgACgCBCICQQF1aiEBIAAoAgAhAAJAAkAgAkEBcUUNACABKAIAIABqKAIAIQAMAQsgACEACyABIAARAAALGgBBAEEoNgKYTkEAQQA2ApxOECpBmM4AEBILOwACQCABDQBB4xNBhgpBC0G+CxAAAAsgAEEBOgAAIABDAACAPyABs5U4AgQgAEEIakEAQYAEEEQaQQELpQECAX0BfAJAIAAtAABFDQAgACABIAAqAgSUIAAqAggiAZIiAyADj5M4AggCQAJAIAFD2w/JQJQgApJD2w/JQBBJQ9sPyUCVu0QAAAAAAADwP6BEAAAAAAAAkECiIgREAAAAAAAA8EFjIAREAAAAAAAAAABmcUUNACAEqyEADAELQQAhAAsgAEH/B3FBAnRBoCNqKgIADwtB+RhBhgpBG0GIDBAAAAusAgMFfQJ/AXwCQAJAAkAgAC0AAEUNACAEQYABSw0BAkAgBA0AQwAAAAAhBQwDCyAAQQhqIQogACoCBCEGQQAhC0MAAAAAIQcDQCAHIQcgAyALIgBBAnQiC2oqAgAhBSAKIAtqIgsgAEEBaiIAsyABlCAGlCALKgIAIgiSIgkgCY+TOAIAAkACQCAIQ9sPyUCUIAKSQ9sPyUAQSUPbD8lAlbtEAAAAAAAA8D+gRAAAAAAAAJBAoiIMRAAAAAAAAPBBYyAMRAAAAAAAAAAAZnFFDQAgDKshCwwBC0EAIQsLIAUgC0H/B3FBAnRBoCNqKgIAlCAHkiIHIQUgACELIAchByAAIARGDQMMAAsAC0H5GEGGCkEoQa8JEAAAC0GVE0GGCkEuQa8JEAAACyAFC5AEAQN/AkAgAkGABEkNACAAIAEgAhAMIAAPCyAAIAJqIQMCQAJAIAEgAHNBA3ENAAJAAkAgAEEDcQ0AIAAhAgwBCwJAIAINACAAIQIMAQsgACECA0AgAiABLQAAOgAAIAFBAWohASACQQFqIgJBA3FFDQEgAiADSQ0ACwsgA0F8cSEEAkAgA0HAAEkNACACIARBQGoiBUsNAANAIAIgASgCADYCACACIAEoAgQ2AgQgAiABKAIINgIIIAIgASgCDDYCDCACIAEoAhA2AhAgAiABKAIUNgIUIAIgASgCGDYCGCACIAEoAhw2AhwgAiABKAIgNgIgIAIgASgCJDYCJCACIAEoAig2AiggAiABKAIsNgIsIAIgASgCMDYCMCACIAEoAjQ2AjQgAiABKAI4NgI4IAIgASgCPDYCPCABQcAAaiEBIAJBwABqIgIgBU0NAAsLIAIgBE8NAQNAIAIgASgCADYCACABQQRqIQEgAkEEaiICIARJDQAMAgsACwJAIANBBE8NACAAIQIMAQsCQCADQXxqIgQgAE8NACAAIQIMAQsgACECA0AgAiABLQAAOgAAIAIgAS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLAkAgAiADTw0AA0AgAiABLQAAOgAAIAFBAWohASACQQFqIgIgA0cNAAsLIAAL8gICA38BfgJAIAJFDQAgACABOgAAIAAgAmoiA0F/aiABOgAAIAJBA0kNACAAIAE6AAIgACABOgABIANBfWogAToAACADQX5qIAE6AAAgAkEHSQ0AIAAgAToAAyADQXxqIAE6AAAgAkEJSQ0AIABBACAAa0EDcSIEaiIDIAFB/wFxQYGChAhsIgE2AgAgAyACIARrQXxxIgRqIgJBfGogATYCACAEQQlJDQAgAyABNgIIIAMgATYCBCACQXhqIAE2AgAgAkF0aiABNgIAIARBGUkNACADIAE2AhggAyABNgIUIAMgATYCECADIAE2AgwgAkFwaiABNgIAIAJBbGogATYCACACQWhqIAE2AgAgAkFkaiABNgIAIAQgA0EEcUEYciIFayICQSBJDQAgAa1CgYCAgBB+IQYgAyAFaiEBA0AgASAGNwMYIAEgBjcDECABIAY3AwggASAGNwMAIAFBIGohASACQWBqIgJBH0sNAAsLIAALNwACQCAAEEZB/////wdxQYCAgPwHSw0AIAAgACABlyABEEZB/////wdxQYCAgPwHSxshAQsgAQsFACAAvAs3AAJAIAAQSEH/////B3FBgICA/AdLDQAgACAAIAGWIAEQSEH/////B3FBgICA/AdLGyEBCyABCwUAIAC8C+wDAQZ/AkACQCABvCICQQF0IgNFDQAgARBKIQQg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ZmVyQXNXYXYAdW5zaWduZWQgc2hvcnQAU3RhcnQAdW5zaWduZWQgaW50AE1JRElDbG9ja1Jlc2V0AGZsb2F0AHVpbnQ2NF90AFByb2Nlc3MAc3RlcCA+PSAwICYmIHN0ZXAgPCBrTWF4U3RlcHMAR2V0V2F2U2l6ZUluQnl0ZXMAT3ZlcnRvbmVTZXJpZXMAR2V0UmVjb3JkQnVmZmVyAHVuc2lnbmVkIGNoYXIALi9zcmMvYXVkaW9fdXRpbHMuaHBwAC4vc3JjL3BhcmFtZXRlci5ocHAALi9zcmMvb3NjaWxsYXRvci5jcHAALi9zcmMvYXVkaW8uY3BwAFN0b3AAR2V0U3RlcABSZWNvcmRBdWRpbwBTZXREdXJhdGlvbgBib29sAEtpY2tTeW50aABTZXRTZXF1ZW5jZUxlbmd0aAB1bnNpZ25lZCBsb25nAHN0ZDo6d3N0cmluZwBzdGQ6OnN0cmluZwBzdGQ6OnUxNnN0cmluZwBzdGQ6OnUzMnN0cmluZwBTZXRUcmlnAEluaXRpYWxpemUAR2V0UmVjb3JkQnVmZmVyU2l6ZQBzZXRWYWx1ZUludGVycG9sYXRlAE1JRElDbG9ja1B1bHNlAFNldFRvbmUAU2luZQBkb3VibGUAU2V0QmVuZAB2b2lkAFJlY29yZEZpbmlzaGVkAG5ld192YWwgPj0gbWluX3ZfICYmIG5ld192YWwgPD0gbWF4X3ZfAFNldEJQTQBTZXRHbG9iYWxGTQBVc2VNSURJAGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQ4X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50NjRfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50NjRfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGNoYXI+AHN0ZDo6YmFzaWNfc3RyaW5nPHVuc2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNpZ25lZCBjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AGJwbSA+IDAAc2FtcGxlX3JhdGUgPiAwAHN0ZXBzIDw9IGtNYXhTdGVwcyAmJiBzdGVwcyA+IDAgJiYgIkludmFsaWQgbnVtYmVyIG9mIHN0ZXBzLCBtdXN0IGJlIGJldHdlZW4gMSBhbmQgbWF4IGFsbG93YWJsZSBzdGVwcyIAZmFsc2UgJiYgIlJlcXVlc3RlZCBudW1iZXIgb2Ygb3ZlcnRvbmVzIGV4Y2VlZHMgbWF4IGFsbG93ZWQgYnkga01heE92ZXJ0b25lcyIAZmFsc2UgJiYgIk9zY2lsbGF0b3I6IEludmFsaWQgU2FtcGxlIFJhdGUiAGZhbHNlICYmICJSZWNvcmRpbmcgcHJvY2VzcyBub3QgZmluaXNoZWQiAGxldmVsX2RCID49IC02MCAmJiBsZXZlbF9kQiA8PSAzNiAmJiAiRk0gbGV2ZWwgSW52YWxpZCwgbXVzdCBiZSBiZXR3ZWVuIC02MGRCIGFuZCAzNmRCIgB2ID49IDAgJiYgdiA8PSAxICYmICJWZWxvY2l0eSBpbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMCBhbmQgMSIAZCA+PSAwICYmIGQgPD0gMSAmJiAiRHVyYXRpb24gaW52YWxpZCwgbXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDEiAHQgPj0gMCAmJiB0IDw9IDEgJiYgIlRvbmUgSW52YWxpZCwgbXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDEiAGIgPj0gMCAmJiBiIDw9IDEgJiYgIkJlbmQgSW52YWxpZCwgbXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDEiAHJhdGVfbXVsdGlwbGllciA+PSAwICYmIHJhdGVfbXVsdGlwbGllciA8PSAxMCAmJiAiRk0gUmF0ZSBNdWx0aXBsaWVyIEludmFsaWQsIG11c3QgYmUgYmV0d2VlbiAwIGFuZCAxMCIAZiA+PSAyMCAmJiBmIDw9IDUwMDAgJiYgIkZyZXF1ZW5jeSBpbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMjAgYW5kIDUwMDAiAGRlY2F5X3RpbWUgPiAwICYmICJBREV4cEVudjogRGVjYXkgVGltZSBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwIgBmYWxzZSAmJiAiT3NjaWxsYXRvciBOb3QgSW5pdGlhbGl6ZWQuIgBOU3QzX18yMTJiYXNpY19zdHJpbmdJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRQAAWCYAAKAMAABOU3QzX18yMTJiYXNpY19zdHJpbmdJaE5TXzExY2hhcl90cmFpdHNJaEVFTlNfOWFsbG9jYXRvckloRUVFRQAAWCYAAOgMAABOU3QzX18yMTJiYXNpY19zdHJpbmdJd05TXzExY2hhcl90cmFpdHNJd0VFTlNfOWFsbG9jYXRvckl3RUVFRQAAWCYAADANAABOU3QzX18yMTJiYXNpY19zdHJpbmdJRHNOU18xMWNoYXJfdHJhaXRzSURzRUVOU185YWxsb2NhdG9ySURzRUVFRQAAAFgmAAB4DQAATlN0M19fMjEyYmFzaWNfc3RyaW5nSURpTlNfMTFjaGFyX3RyYWl0c0lEaUVFTlNfOWFsbG9jYXRvcklEaUVFRUUAAABYJgAAxA0AAE4xMGVtc2NyaXB0ZW4zdmFsRQAAWCYAABAOAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0ljRUUAAFgmAAAsDgAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJYUVFAABYJgAAVA4AAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWhFRQAAWCYAAHwOAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlf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';
    return f;
}

var wasmBinaryFile;

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  var binary = tryParseAsDataURI(file);
  if (binary) {
    return binary;
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw 'sync fetching of the wasm failed: you can preload it to Module["wasmBinary"] manually, or emcc.py will do that for you when generating HTML (but not JS)';
}

function getBinaryPromise(binaryFile) {

  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateSync(file, info) {
  var module;
  var binary = getBinarySync(file);
  module = new WebAssembly.Module(binary);
  var instance = new WebAssembly.Instance(module, info);
  return [instance, module];
}

function getWasmImports() {
  // prepare imports
  return {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  }
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  var info = getWasmImports();
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    
    updateMemoryViews();

    wasmTable = wasmExports['__indirect_function_table'];
    

    addOnInit(wasmExports['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
        return false;
    }
  }

  if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();

  var result = instantiateSync(wasmBinaryFile, info);
  // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193,
  // the above line no longer optimizes out down to the following line.
  // When the regression is fixed, we can remove this if/else.
  return receiveInstance(result[0]);
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
// end include: runtime_debug.js
// === Body ===
// end include: preamble.js


  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': abort('to do getValue(i64) use WASM_BIGINT');
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = Module['noExitRuntime'] || true;

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': abort('to do setValue(i64) use WASM_BIGINT');
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder() : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead) => {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    };
  var ___assert_fail = (condition, filename, line, func) => {
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);
    };

  var __abort_js = () => {
      abort('');
    };

  var __embind_register_bigint = (primitiveType, name, size, minRange, maxRange) => {};

  var embind_init_charCodes = () => {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    };
  var embind_charCodes;
  var readLatin1String = (ptr) => {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    };
  
  var awaitingDependencies = {
  };
  
  var registeredTypes = {
  };
  
  var typeDependencies = {
  };
  
  var BindingError;
  var throwBindingError = (message) => { throw new BindingError(message); };
  
  
  
  
  var InternalError;
  var throwInternalError = (message) => { throw new InternalError(message); };
  var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });
  
      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach((dt, i) => {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      });
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    };
  /** @param {Object=} options */
  function sharedRegisterType(rawType, registeredInstance, options = {}) {
      var name = registeredInstance.name;
      if (!rawType) {
        throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError(`Cannot register type '${name}' twice`);
        }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
  /** @param {Object=} options */
  function registerType(rawType, registeredInstance, options = {}) {
      if (!('argPackAdvance' in registeredInstance)) {
        throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }
      return sharedRegisterType(rawType, registeredInstance, options);
    }
  
  var GenericWireTypeSize = 8;
  /** @suppress {globalThis} */
  var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
      name = readLatin1String(name);
      registerType(rawType, {
          name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': GenericWireTypeSize,
          'readValueFromPointer': function(pointer) {
              return this['fromWireType'](HEAPU8[pointer]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    };

  
  
  var shallowCopyInternalPointer = (o) => {
      return {
        count: o.count,
        deleteScheduled: o.deleteScheduled,
        preservePointerOnDelete: o.preservePointerOnDelete,
        ptr: o.ptr,
        ptrType: o.ptrType,
        smartPtr: o.smartPtr,
        smartPtrType: o.smartPtrType,
      };
    };
  
  var throwInstanceAlreadyDeleted = (obj) => {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
    };
  
  var finalizationRegistry = false;
  
  var detachFinalizer = (handle) => {};
  
  var runDestructor = ($$) => {
      if ($$.smartPtr) {
        $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
        $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    };
  var releaseClassHandle = ($$) => {
      $$.count.value -= 1;
      var toDelete = 0 === $$.count.value;
      if (toDelete) {
        runDestructor($$);
      }
    };
  
  var downcastPointer = (ptr, ptrClass, desiredClass) => {
      if (ptrClass === desiredClass) {
        return ptr;
      }
      if (undefined === desiredClass.baseClass) {
        return null; // no conversion
      }
  
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
        return null;
      }
      return desiredClass.downcast(rv);
    };
  
  var registeredPointers = {
  };
  
  var getInheritedInstanceCount = () => Object.keys(registeredInstances).length;
  
  var getLiveInheritedInstances = () => {
      var rv = [];
      for (var k in registeredInstances) {
        if (registeredInstances.hasOwnProperty(k)) {
          rv.push(registeredInstances[k]);
        }
      }
      return rv;
    };
  
  var deletionQueue = [];
  var flushPendingDeletes = () => {
      while (deletionQueue.length) {
        var obj = deletionQueue.pop();
        obj.$$.deleteScheduled = false;
        obj['delete']();
      }
    };
  
  var delayFunction;
  
  
  var setDelayFunction = (fn) => {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
    };
  var init_embind = () => {
      Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
      Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
      Module['flushPendingDeletes'] = flushPendingDeletes;
      Module['setDelayFunction'] = setDelayFunction;
    };
  var registeredInstances = {
  };
  
  var getBasestPointer = (class_, ptr) => {
      if (ptr === undefined) {
          throwBindingError('ptr should not be undefined');
      }
      while (class_.baseClass) {
          ptr = class_.upcast(ptr);
          class_ = class_.baseClass;
      }
      return ptr;
    };
  var getInheritedInstance = (class_, ptr) => {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    };
  
  
  var makeClassHandle = (prototype, record) => {
      if (!record.ptrType || !record.ptr) {
        throwInternalError('makeClassHandle requires ptr and ptrType');
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
        throwInternalError('Both smartPtrType and smartPtr must be specified');
      }
      record.count = { value: 1 };
      return attachFinalizer(Object.create(prototype, {
        $$: {
          value: record,
          writable: true,
        },
      }));
    };
  /** @suppress {globalThis} */
  function RegisteredPointer_fromWireType(ptr) {
      // ptr is a raw pointer (or a raw smartpointer)
  
      // rawPointer is a maybe-null raw pointer
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
        this.destructor(ptr);
        return null;
      }
  
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (undefined !== registeredInstance) {
        // JS object has been neutered, time to repopulate it
        if (0 === registeredInstance.$$.count.value) {
          registeredInstance.$$.ptr = rawPointer;
          registeredInstance.$$.smartPtr = ptr;
          return registeredInstance['clone']();
        } else {
          // else, just increment reference count on existing object
          // it already has a reference to the smart pointer
          var rv = registeredInstance['clone']();
          this.destructor(ptr);
          return rv;
        }
      }
  
      function makeDefaultHandle() {
        if (this.isSmartPointer) {
          return makeClassHandle(this.registeredClass.instancePrototype, {
            ptrType: this.pointeeType,
            ptr: rawPointer,
            smartPtrType: this,
            smartPtr: ptr,
          });
        } else {
          return makeClassHandle(this.registeredClass.instancePrototype, {
            ptrType: this,
            ptr,
          });
        }
      }
  
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
        return makeDefaultHandle.call(this);
      }
  
      var toType;
      if (this.isConst) {
        toType = registeredPointerRecord.constPointerType;
      } else {
        toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(
          rawPointer,
          this.registeredClass,
          toType.registeredClass);
      if (dp === null) {
        return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
        return makeClassHandle(toType.registeredClass.instancePrototype, {
          ptrType: toType,
          ptr: dp,
          smartPtrType: this,
          smartPtr: ptr,
        });
      } else {
        return makeClassHandle(toType.registeredClass.instancePrototype, {
          ptrType: toType,
          ptr: dp,
        });
      }
    }
  var attachFinalizer = (handle) => {
      if ('undefined' === typeof FinalizationRegistry) {
        attachFinalizer = (handle) => handle;
        return handle;
      }
      // If the running environment has a FinalizationRegistry (see
      // https://github.com/tc39/proposal-weakrefs), then attach finalizers
      // for class handles.  We check for the presence of FinalizationRegistry
      // at run-time, not build-time.
      finalizationRegistry = new FinalizationRegistry((info) => {
        releaseClassHandle(info.$$);
      });
      attachFinalizer = (handle) => {
        var $$ = handle.$$;
        var hasSmartPtr = !!$$.smartPtr;
        if (hasSmartPtr) {
          // We should not call the destructor on raw pointers in case other code expects the pointee to live
          var info = { $$: $$ };
          finalizationRegistry.register(handle, info, handle);
        }
        return handle;
      };
      detachFinalizer = (handle) => finalizationRegistry.unregister(handle);
      return attachFinalizer(handle);
    };
  
  
  
  var init_ClassHandle = () => {
      Object.assign(ClassHandle.prototype, {
        "isAliasOf"(other) {
          if (!(this instanceof ClassHandle)) {
            return false;
          }
          if (!(other instanceof ClassHandle)) {
            return false;
          }
  
          var leftClass = this.$$.ptrType.registeredClass;
          var left = this.$$.ptr;
          other.$$ = /** @type {Object} */ (other.$$);
          var rightClass = other.$$.ptrType.registeredClass;
          var right = other.$$.ptr;
  
          while (leftClass.baseClass) {
            left = leftClass.upcast(left);
            leftClass = leftClass.baseClass;
          }
  
          while (rightClass.baseClass) {
            right = rightClass.upcast(right);
            rightClass = rightClass.baseClass;
          }
  
          return leftClass === rightClass && left === right;
        },
  
        "clone"() {
          if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
          }
  
          if (this.$$.preservePointerOnDelete) {
            this.$$.count.value += 1;
            return this;
          } else {
            var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), {
              $$: {
                value: shallowCopyInternalPointer(this.$$),
              }
            }));
  
            clone.$$.count.value += 1;
            clone.$$.deleteScheduled = false;
            return clone;
          }
        },
  
        "delete"() {
          if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
          }
  
          if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError('Object already scheduled for deletion');
          }
  
          detachFinalizer(this);
          releaseClassHandle(this.$$);
  
          if (!this.$$.preservePointerOnDelete) {
            this.$$.smartPtr = undefined;
            this.$$.ptr = undefined;
          }
        },
  
        "isDeleted"() {
          return !this.$$.ptr;
        },
  
        "deleteLater"() {
          if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this);
          }
          if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError('Object already scheduled for deletion');
          }
          deletionQueue.push(this);
          if (deletionQueue.length === 1 && delayFunction) {
            delayFunction(flushPendingDeletes);
          }
          this.$$.deleteScheduled = true;
          return this;
        },
      });
    };
  /** @constructor */
  function ClassHandle() {
    }
  
  var createNamedFunction = (name, body) => Object.defineProperty(body, 'name', {
      value: name
    });
  
  
  var ensureOverloadTable = (proto, methodName, humanName) => {
      if (undefined === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
        proto[methodName] = function(...args) {
          // TODO This check can be removed in -O3 level "unsafe" optimizations.
          if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) {
            throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
          }
          return proto[methodName].overloadTable[args.length].apply(this, args);
        };
        // Move the previous function into the overload table.
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    };
  
  /** @param {number=} numArguments */
  var exposePublicSymbol = (name, value, numArguments) => {
      if (Module.hasOwnProperty(name)) {
        if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
          throwBindingError(`Cannot register public name '${name}' twice`);
        }
  
        // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
        // that routes between the two.
        ensureOverloadTable(Module, name, name);
        if (Module.hasOwnProperty(numArguments)) {
          throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
        }
        // Add the new function into the overload table.
        Module[name].overloadTable[numArguments] = value;
      }
      else {
        Module[name] = value;
        if (undefined !== numArguments) {
          Module[name].numArguments = numArguments;
        }
      }
    };
  
  var char_0 = 48;
  
  var char_9 = 57;
  var makeLegalFunctionName = (name) => {
      if (undefined === name) {
        return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return `_${name}`;
      }
      return name;
    };
  
  
  /** @constructor */
  function RegisteredClass(name,
                               constructor,
                               instancePrototype,
                               rawDestructor,
                               baseClass,
                               getActualType,
                               upcast,
                               downcast) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
  
  
  var upcastPointer = (ptr, ptrClass, desiredClass) => {
      while (ptrClass !== desiredClass) {
        if (!ptrClass.upcast) {
          throwBindingError(`Expected null or instance of ${desiredClass.name}, got an instance of ${ptrClass.name}`);
        }
        ptr = ptrClass.upcast(ptr);
        ptrClass = ptrClass.baseClass;
      }
      return ptr;
    };
  /** @suppress {globalThis} */
  function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError(`null is not a valid ${this.name}`);
        }
        return 0;
      }
  
      if (!handle.$$) {
        throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
      }
      if (!handle.$$.ptr) {
        throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  
  /** @suppress {globalThis} */
  function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
        if (this.isReference) {
          throwBindingError(`null is not a valid ${this.name}`);
        }
  
        if (this.isSmartPointer) {
          ptr = this.rawConstructor();
          if (destructors !== null) {
            destructors.push(this.rawDestructor, ptr);
          }
          return ptr;
        } else {
          return 0;
        }
      }
  
      if (!handle || !handle.$$) {
        throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
      }
      if (!handle.$$.ptr) {
        throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
        throwBindingError(`Cannot convert argument of type ${(handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name)} to parameter type ${this.name}`);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
  
      if (this.isSmartPointer) {
        // TODO: this is not strictly true
        // We could support BY_EMVAL conversions from raw pointers to smart pointers
        // because the smart pointer can hold a reference to the handle
        if (undefined === handle.$$.smartPtr) {
          throwBindingError('Passing raw pointer to smart pointer is illegal');
        }
  
        switch (this.sharingPolicy) {
          case 0: // NONE
            // no upcasting
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              throwBindingError(`Cannot convert argument of type ${(handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name)} to parameter type ${this.name}`);
            }
            break;
  
          case 1: // INTRUSIVE
            ptr = handle.$$.smartPtr;
            break;
  
          case 2: // BY_EMVAL
            if (handle.$$.smartPtrType === this) {
              ptr = handle.$$.smartPtr;
            } else {
              var clonedHandle = handle['clone']();
              ptr = this.rawShare(
                ptr,
                Emval.toHandle(() => clonedHandle['delete']())
              );
              if (destructors !== null) {
                destructors.push(this.rawDestructor, ptr);
              }
            }
            break;
  
          default:
            throwBindingError('Unsupporting sharing policy');
        }
      }
      return ptr;
    }
  
  
  /** @suppress {globalThis} */
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
        if (this.isReference) {
          throwBindingError(`null is not a valid ${this.name}`);
        }
        return 0;
      }
  
      if (!handle.$$) {
        throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
      }
      if (!handle.$$.ptr) {
        throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
      }
      if (handle.$$.ptrType.isConst) {
          throwBindingError(`Cannot convert argument of type ${handle.$$.ptrType.name} to parameter type ${this.name}`);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  
  /** @suppress {globalThis} */
  function readPointer(pointer) {
      return this['fromWireType'](HEAPU32[((pointer)>>2)]);
    }
  
  
  var init_RegisteredPointer = () => {
      Object.assign(RegisteredPointer.prototype, {
        getPointee(ptr) {
          if (this.rawGetPointee) {
            ptr = this.rawGetPointee(ptr);
          }
          return ptr;
        },
        destructor(ptr) {
          this.rawDestructor?.(ptr);
        },
        'argPackAdvance': GenericWireTypeSize,
        'readValueFromPointer': readPointer,
        'fromWireType': RegisteredPointer_fromWireType,
      });
    };
  /** @constructor
      @param {*=} pointeeType,
      @param {*=} sharingPolicy,
      @param {*=} rawGetPointee,
      @param {*=} rawConstructor,
      @param {*=} rawShare,
      @param {*=} rawDestructor,
       */
  function RegisteredPointer(
      name,
      registeredClass,
      isReference,
      isConst,
  
      // smart pointer properties
      isSmartPointer,
      pointeeType,
      sharingPolicy,
      rawGetPointee,
      rawConstructor,
      rawShare,
      rawDestructor
    ) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
  
      // smart pointer properties
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
  
      if (!isSmartPointer && registeredClass.baseClass === undefined) {
        if (isConst) {
          this['toWireType'] = constNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        } else {
          this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
          this.destructorFunction = null;
        }
      } else {
        this['toWireType'] = genericPointerToWireType;
        // Here we must leave this.destructorFunction undefined, since whether genericPointerToWireType returns
        // a pointer that needs to be freed up is runtime-dependent, and cannot be evaluated at registration time.
        // TODO: Create an alternative mechanism that allows removing the use of var destructors = []; array in
        //       craftInvokerFunction altogether.
      }
    }
  
  /** @param {number=} numArguments */
  var replacePublicSymbol = (name, value, numArguments) => {
      if (!Module.hasOwnProperty(name)) {
        throwInternalError('Replacing nonexistent public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
        Module[name].overloadTable[numArguments] = value;
      }
      else {
        Module[name] = value;
        Module[name].argCount = numArguments;
      }
    };
  
  
  
  var dynCallLegacy = (sig, ptr, args) => {
      sig = sig.replace(/p/g, 'i')
      var f = Module['dynCall_' + sig];
      return f(ptr, ...args);
    };
  
  var wasmTableMirror = [];
  
  /** @type {WebAssembly.Table} */
  var wasmTable;
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      return func;
    };
  
  var dynCall = (sig, ptr, args = []) => {
      // Without WASM_BIGINT support we cannot directly call function with i64 as
      // part of their signature, so we rely on the dynCall functions generated by
      // wasm-emscripten-finalize
      if (sig.includes('j')) {
        return dynCallLegacy(sig, ptr, args);
      }
      var rtn = getWasmTableEntry(ptr)(...args);
      return rtn;
    };
  var getDynCaller = (sig, ptr) => {
      return (...args) => dynCall(sig, ptr, args);
    };
  
  
  var embind__requireFunction = (signature, rawFunction) => {
      signature = readLatin1String(signature);
  
      function makeDynCaller() {
        if (signature.includes('j')) {
          return getDynCaller(signature, rawFunction);
        }
        return getWasmTableEntry(rawFunction);
      }
  
      var fp = makeDynCaller();
      if (typeof fp != "function") {
          throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
      }
      return fp;
    };
  
  
  
  var extendError = (baseErrorType, errorName) => {
      var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
  
        var stack = (new Error(message)).stack;
        if (stack !== undefined) {
          this.stack = this.toString() + '\n' +
              stack.replace(/^Error(:[^\n]*)?\n/, '');
        }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
        if (this.message === undefined) {
          return this.name;
        } else {
          return `${this.name}: ${this.message}`;
        }
      };
  
      return errorClass;
    };
  var UnboundTypeError;
  
  
  
  var getTypeName = (type) => {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    };
  var throwUnboundTypeError = (message, types) => {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([', ']));
    };
  
  var __embind_register_class = (rawType,
                             rawPointerType,
                             rawConstPointerType,
                             baseClassRawType,
                             getActualTypeSignature,
                             getActualType,
                             upcastSignature,
                             upcast,
                             downcastSignature,
                             downcast,
                             name,
                             destructorSignature,
                             rawDestructor) => {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      upcast &&= embind__requireFunction(upcastSignature, upcast);
      downcast &&= embind__requireFunction(downcastSignature, downcast);
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
  
      exposePublicSymbol(legalFunctionName, function() {
        // this code cannot run if baseClassRawType is zero
        throwUnboundTypeError(`Cannot construct ${name} due to unbound types`, [baseClassRawType]);
      });
  
      whenDependentTypesAreResolved(
        [rawType, rawPointerType, rawConstPointerType],
        baseClassRawType ? [baseClassRawType] : [],
        (base) => {
          base = base[0];
  
          var baseClass;
          var basePrototype;
          if (baseClassRawType) {
            baseClass = base.registeredClass;
            basePrototype = baseClass.instancePrototype;
          } else {
            basePrototype = ClassHandle.prototype;
          }
  
          var constructor = createNamedFunction(name, function(...args) {
            if (Object.getPrototypeOf(this) !== instancePrototype) {
              throw new BindingError("Use 'new' to construct " + name);
            }
            if (undefined === registeredClass.constructor_body) {
              throw new BindingError(name + " has no accessible constructor");
            }
            var body = registeredClass.constructor_body[args.length];
            if (undefined === body) {
              throw new BindingError(`Tried to invoke ctor of ${name} with invalid number of parameters (${args.length}) - expected (${Object.keys(registeredClass.constructor_body).toString()}) parameters instead!`);
            }
            return body.apply(this, args);
          });
  
          var instancePrototype = Object.create(basePrototype, {
            constructor: { value: constructor },
          });
  
          constructor.prototype = instancePrototype;
  
          var registeredClass = new RegisteredClass(name,
                                                    constructor,
                                                    instancePrototype,
                                                    rawDestructor,
                                                    baseClass,
                                                    getActualType,
                                                    upcast,
                                                    downcast);
  
          if (registeredClass.baseClass) {
            // Keep track of class hierarchy. Used to allow sub-classes to inherit class functions.
            registeredClass.baseClass.__derivedClasses ??= [];
  
            registeredClass.baseClass.__derivedClasses.push(registeredClass);
          }
  
          var referenceConverter = new RegisteredPointer(name,
                                                         registeredClass,
                                                         true,
                                                         false,
                                                         false);
  
          var pointerConverter = new RegisteredPointer(name + '*',
                                                       registeredClass,
                                                       false,
                                                       false,
                                                       false);
  
          var constPointerConverter = new RegisteredPointer(name + ' const*',
                                                            registeredClass,
                                                            false,
                                                            true,
                                                            false);
  
          registeredPointers[rawType] = {
            pointerType: pointerConverter,
            constPointerType: constPointerConverter
          };
  
          replacePublicSymbol(legalFunctionName, constructor);
  
          return [referenceConverter, pointerConverter, constPointerConverter];
        }
      );
    };

  var heap32VectorToArray = (count, firstElement) => {
      var array = [];
      for (var i = 0; i < count; i++) {
        // TODO(https://github.com/emscripten-core/emscripten/issues/17310):
        // Find a way to hoist the `>> 2` or `>> 3` out of this loop.
        array.push(HEAPU32[(((firstElement)+(i * 4))>>2)]);
      }
      return array;
    };
  
  
  var runDestructors = (destructors) => {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    };
  
  
  
  
  
  
  
  function usesDestructorStack(argTypes) {
      // Skip return value at index 0 - it's not deleted here.
      for (var i = 1; i < argTypes.length; ++i) {
        // The type does not define a destructor function - must use dynamic stack
        if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
          return true;
        }
      }
      return false;
    }
  
  function newFunc(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
        throw new TypeError(`new_ called with constructor type ${typeof(constructor)} which is not a function`);
      }
      /*
       * Previously, the following line was just:
       *   function dummy() {};
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even
       * though at creation, the 'dummy' has the correct constructor name.  Thus,
       * objects created with IMVU.new would show up in the debugger as 'dummy',
       * which isn't very helpful.  Using IMVU.createNamedFunction addresses the
       * issue.  Doubly-unfortunately, there's no way to write a test for this
       * behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;
  
      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }
  
  function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
      var needsDestructorStack = usesDestructorStack(argTypes);
      var argCount = argTypes.length;
      var argsList = "";
      var argsListWired = "";
      for (var i = 0; i < argCount - 2; ++i) {
        argsList += (i!==0?", ":"")+"arg"+i;
        argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }
  
      var invokerFnBody = `
        return function (${argsList}) {
        if (arguments.length !== ${argCount - 2}) {
          throwBindingError('function ' + humanName + ' called with ' + arguments.length + ' arguments, expected ${argCount - 2}');
        }`;
  
      if (needsDestructorStack) {
        invokerFnBody += "var destructors = [];\n";
      }
  
      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["humanName", "throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
  
      if (isClassMethodFunc) {
        invokerFnBody += "var thisWired = classParam['toWireType']("+dtorStack+", this);\n";
      }
  
      for (var i = 0; i < argCount - 2; ++i) {
        invokerFnBody += "var arg"+i+"Wired = argType"+i+"['toWireType']("+dtorStack+", arg"+i+");\n";
        args1.push("argType"+i);
      }
  
      if (isClassMethodFunc) {
        argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }
  
      invokerFnBody +=
          (returns || isAsync ? "var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";
  
      var returnVal = returns ? "rv" : "";
  
      if (needsDestructorStack) {
        invokerFnBody += "runDestructors(destructors);\n";
      } else {
        for (var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
          var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
          if (argTypes[i].destructorFunction !== null) {
            invokerFnBody += `${paramName}_dtor(${paramName});\n`;
            args1.push(`${paramName}_dtor`);
          }
        }
      }
  
      if (returns) {
        invokerFnBody += "var ret = retType['fromWireType'](rv);\n" +
                         "return ret;\n";
      } else {
      }
  
      invokerFnBody += "}\n";
  
      return [args1, invokerFnBody];
    }
  function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, /** boolean= */ isAsync) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      // isAsync: Optional. If true, returns an async function. Async bindings are only supported with JSPI.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = usesDestructorStack(argTypes);
  
      var returns = (argTypes[0].name !== "void");
  
    // Builld the arguments that will be passed into the closure around the invoker
    // function.
    var closureArgs = [humanName, throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
    for (var i = 0; i < argCount - 2; ++i) {
      closureArgs.push(argTypes[i+2]);
    }
    if (!needsDestructorStack) {
      for (var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
        if (argTypes[i].destructorFunction !== null) {
          closureArgs.push(argTypes[i].destructorFunction);
        }
      }
    }
  
    let [args, invokerFnBody] = createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync);
    args.push(invokerFnBody);
    var invokerFn = newFunc(Function, args)(...closureArgs);
      return createNamedFunction(humanName, invokerFn);
    }
  var __embind_register_class_constructor = (
      rawClassType,
      argCount,
      rawArgTypesAddr,
      invokerSignature,
      invoker,
      rawConstructor
    ) => {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);
      var args = [rawConstructor];
      var destructors = [];
  
      whenDependentTypesAreResolved([], [rawClassType], (classType) => {
        classType = classType[0];
        var humanName = `constructor ${classType.name}`;
  
        if (undefined === classType.registeredClass.constructor_body) {
          classType.registeredClass.constructor_body = [];
        }
        if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
          throw new BindingError(`Cannot register multiple constructors with identical number of parameters (${argCount-1}) for class '${classType.name}'! Overload resolution is currently only performed using the parameter count, not actual type info!`);
        }
        classType.registeredClass.constructor_body[argCount - 1] = () => {
          throwUnboundTypeError(`Cannot construct ${classType.name} due to unbound types`, rawArgTypes);
        };
  
        whenDependentTypesAreResolved([], rawArgTypes, (argTypes) => {
          // Insert empty slot for context type (argTypes[1]).
          argTypes.splice(1, 0, null);
          classType.registeredClass.constructor_body[argCount - 1] = craftInvokerFunction(humanName, argTypes, null, invoker, rawConstructor);
          return [];
        });
        return [];
      });
    };

  
  
  
  
  
  
  var getFunctionName = (signature) => {
      signature = signature.trim();
      const argsIndex = signature.indexOf("(");
      if (argsIndex !== -1) {
        return signature.substr(0, argsIndex);
      } else {
        return signature;
      }
    };
  var __embind_register_class_function = (rawClassType,
                                      methodName,
                                      argCount,
                                      rawArgTypesAddr, // [ReturnType, ThisType, Args...]
                                      invokerSignature,
                                      rawInvoker,
                                      context,
                                      isPureVirtual,
                                      isAsync) => {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      methodName = getFunctionName(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
  
      whenDependentTypesAreResolved([], [rawClassType], (classType) => {
        classType = classType[0];
        var humanName = `${classType.name}.${methodName}`;
  
        if (methodName.startsWith("@@")) {
          methodName = Symbol[methodName.substring(2)];
        }
  
        if (isPureVirtual) {
          classType.registeredClass.pureVirtualFunctions.push(methodName);
        }
  
        function unboundTypesHandler() {
          throwUnboundTypeError(`Cannot call ${humanName} due to unbound types`, rawArgTypes);
        }
  
        var proto = classType.registeredClass.instancePrototype;
        var method = proto[methodName];
        if (undefined === method || (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)) {
          // This is the first overload to be registered, OR we are replacing a
          // function in the base class with a function in the derived class.
          unboundTypesHandler.argCount = argCount - 2;
          unboundTypesHandler.className = classType.name;
          proto[methodName] = unboundTypesHandler;
        } else {
          // There was an existing function with the same name registered. Set up
          // a function overload routing table.
          ensureOverloadTable(proto, methodName, humanName);
          proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
        }
  
        whenDependentTypesAreResolved([], rawArgTypes, (argTypes) => {
          var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context, isAsync);
  
          // Replace the initial unbound-handler-stub function with the
          // appropriate member function, now that all types are resolved. If
          // multiple overloads are registered for this function, the function
          // goes into an overload table.
          if (undefined === proto[methodName].overloadTable) {
            // Set argCount in case an overload is registered later
            memberFunction.argCount = argCount - 2;
            proto[methodName] = memberFunction;
          } else {
            proto[methodName].overloadTable[argCount - 2] = memberFunction;
          }
  
          return [];
        });
        return [];
      });
    };

  
  var emval_freelist = [];
  
  var emval_handles = [];
  var __emval_decref = (handle) => {
      if (handle > 9 && 0 === --emval_handles[handle + 1]) {
        emval_handles[handle] = undefined;
        emval_freelist.push(handle);
      }
    };
  
  
  
  
  
  var count_emval_handles = () => {
      return emval_handles.length / 2 - 5 - emval_freelist.length;
    };
  
  var init_emval = () => {
      // reserve 0 and some special values. These never get de-allocated.
      emval_handles.push(
        0, 1,
        undefined, 1,
        null, 1,
        true, 1,
        false, 1,
      );
      Module['count_emval_handles'] = count_emval_handles;
    };
  var Emval = {
  toValue:(handle) => {
        if (!handle) {
            throwBindingError('Cannot use deleted val. handle = ' + handle);
        }
        return emval_handles[handle];
      },
  toHandle:(value) => {
        switch (value) {
          case undefined: return 2;
          case null: return 4;
          case true: return 6;
          case false: return 8;
          default:{
            const handle = emval_freelist.pop() || emval_handles.length;
            emval_handles[handle] = value;
            emval_handles[handle + 1] = 1;
            return handle;
          }
        }
      },
  };
  
  
  var EmValType = {
      name: 'emscripten::val',
      'fromWireType': (handle) => {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      },
      'toWireType': (destructors, value) => Emval.toHandle(value),
      'argPackAdvance': GenericWireTypeSize,
      'readValueFromPointer': readPointer,
      destructorFunction: null, // This type does not need a destructor
  
      // TODO: do we need a deleteObject here?  write a test where
      // emval is passed into JS via an interface
    };
  var __embind_register_emval = (rawType) => registerType(rawType, EmValType);

  var embindRepr = (v) => {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    };
  
  var floatReadValueFromPointer = (name, width) => {
      switch (width) {
          case 4: return function(pointer) {
              return this['fromWireType'](HEAPF32[((pointer)>>2)]);
          };
          case 8: return function(pointer) {
              return this['fromWireType'](HEAPF64[((pointer)>>3)]);
          };
          default:
              throw new TypeError(`invalid float width (${width}): ${name}`);
      }
    };
  
  
  var __embind_register_float = (rawType, name, size) => {
      name = readLatin1String(name);
      registerType(rawType, {
        name,
        'fromWireType': (value) => value,
        'toWireType': (destructors, value) => {
          // The VM will perform JS to Wasm value conversion, according to the spec:
          // https://www.w3.org/TR/wasm-js-api-1/#towebassemblyvalue
          return value;
        },
        'argPackAdvance': GenericWireTypeSize,
        'readValueFromPointer': floatReadValueFromPointer(name, size),
        destructorFunction: null, // This type does not need a destructor
      });
    };

  
  var integerReadValueFromPointer = (name, width, signed) => {
      // integers are quite common, so generate very specialized functions
      switch (width) {
          case 1: return signed ?
              (pointer) => HEAP8[pointer] :
              (pointer) => HEAPU8[pointer];
          case 2: return signed ?
              (pointer) => HEAP16[((pointer)>>1)] :
              (pointer) => HEAPU16[((pointer)>>1)]
          case 4: return signed ?
              (pointer) => HEAP32[((pointer)>>2)] :
              (pointer) => HEAPU32[((pointer)>>2)]
          default:
              throw new TypeError(`invalid integer width (${width}): ${name}`);
      }
    };
  
  
  /** @suppress {globalThis} */
  var __embind_register_integer = (primitiveType, name, size, minRange, maxRange) => {
      name = readLatin1String(name);
      // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come
      // out as 'i32 -1'. Always treat those as max u32.
      if (maxRange === -1) {
        maxRange = 4294967295;
      }
  
      var fromWireType = (value) => value;
  
      if (minRange === 0) {
        var bitshift = 32 - 8*size;
        fromWireType = (value) => (value << bitshift) >>> bitshift;
      }
  
      var isUnsignedType = (name.includes('unsigned'));
      var checkAssertions = (value, toTypeName) => {
      }
      var toWireType;
      if (isUnsignedType) {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value >>> 0;
        }
      } else {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          // The VM will perform JS to Wasm value conversion, according to the spec:
          // https://www.w3.org/TR/wasm-js-api-1/#towebassemblyvalue
          return value;
        }
      }
      registerType(primitiveType, {
        name,
        'fromWireType': fromWireType,
        'toWireType': toWireType,
        'argPackAdvance': GenericWireTypeSize,
        'readValueFromPointer': integerReadValueFromPointer(name, size, minRange !== 0),
        destructorFunction: null, // This type does not need a destructor
      });
    };

  
  var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
      var typeMapping = [
        Int8Array,
        Uint8Array,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
        var size = HEAPU32[((handle)>>2)];
        var data = HEAPU32[(((handle)+(4))>>2)];
        return new TA(HEAP8.buffer, data, size);
      }
  
      name = readLatin1String(name);
      registerType(rawType, {
        name,
        'fromWireType': decodeMemoryView,
        'argPackAdvance': GenericWireTypeSize,
        'readValueFromPointer': decodeMemoryView,
      }, {
        ignoreDuplicateRegistrations: true,
      });
    };

  
  
  
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  
  
  var __embind_register_std_string = (rawType, name) => {
      name = readLatin1String(name);
      var stdStringIsUTF8
      //process only std::string bindings with UTF8 support, in contrast to e.g. std::basic_string<unsigned char>
      = (name === "std::string");
  
      registerType(rawType, {
        name,
        // For some method names we use string keys here since they are part of
        // the public/external API and/or used by the runtime-generated code.
        'fromWireType'(value) {
          var length = HEAPU32[((value)>>2)];
          var payload = value + 4;
  
          var str;
          if (stdStringIsUTF8) {
            var decodeStartPtr = payload;
            // Looping here to support possible embedded '0' bytes
            for (var i = 0; i <= length; ++i) {
              var currentBytePtr = payload + i;
              if (i == length || HEAPU8[currentBytePtr] == 0) {
                var maxRead = currentBytePtr - decodeStartPtr;
                var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                if (str === undefined) {
                  str = stringSegment;
                } else {
                  str += String.fromCharCode(0);
                  str += stringSegment;
                }
                decodeStartPtr = currentBytePtr + 1;
              }
            }
          } else {
            var a = new Array(length);
            for (var i = 0; i < length; ++i) {
              a[i] = String.fromCharCode(HEAPU8[payload + i]);
            }
            str = a.join('');
          }
  
          _free(value);
  
          return str;
        },
        'toWireType'(destructors, value) {
          if (value instanceof ArrayBuffer) {
            value = new Uint8Array(value);
          }
  
          var length;
          var valueIsOfTypeString = (typeof value == 'string');
  
          if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
            throwBindingError('Cannot pass non-string to std::string');
          }
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            length = lengthBytesUTF8(value);
          } else {
            length = value.length;
          }
  
          // assumes POINTER_SIZE alignment
          var base = _malloc(4 + length + 1);
          var ptr = base + 4;
          HEAPU32[((base)>>2)] = length;
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            stringToUTF8(value, ptr, length + 1);
          } else {
            if (valueIsOfTypeString) {
              for (var i = 0; i < length; ++i) {
                var charCode = value.charCodeAt(i);
                if (charCode > 255) {
                  _free(ptr);
                  throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                }
                HEAPU8[ptr + i] = charCode;
              }
            } else {
              for (var i = 0; i < length; ++i) {
                HEAPU8[ptr + i] = value[i];
              }
            }
          }
  
          if (destructors !== null) {
            destructors.push(_free, base);
          }
          return base;
        },
        'argPackAdvance': GenericWireTypeSize,
        'readValueFromPointer': readPointer,
        destructorFunction(ptr) {
          _free(ptr);
        },
      });
    };

  
  
  
  var UTF16Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf-16le') : undefined;;
  var UTF16ToString = (ptr, maxBytesToRead) => {
      var endPtr = ptr;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // Also, use the length info to avoid running tiny strings through
      // TextDecoder, since .subarray() allocates garbage.
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
  
      if (endPtr - ptr > 32 && UTF16Decoder)
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  
      // Fallback: decode without UTF16Decoder
      var str = '';
  
      // If maxBytesToRead is not passed explicitly, it will be undefined, and the
      // for-loop's condition will always evaluate to true. The loop is then
      // terminated on the first null char.
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
        if (codeUnit == 0) break;
        // fromCharCode constructs a character from a UTF-16 code unit, so we can
        // pass the UTF16 string right through.
        str += String.fromCharCode(codeUnit);
      }
  
      return str;
    };
  
  var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      maxBytesToWrite ??= 0x7FFFFFFF;
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2; // Null terminator.
      var startPtr = outPtr;
      var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        HEAP16[((outPtr)>>1)] = codeUnit;
        outPtr += 2;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP16[((outPtr)>>1)] = 0;
      return outPtr - startPtr;
    };
  
  var lengthBytesUTF16 = (str) => {
      return str.length*2;
    };
  
  var UTF32ToString = (ptr, maxBytesToRead) => {
      var i = 0;
  
      var str = '';
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
        if (utf32 == 0) break;
        ++i;
        // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        if (utf32 >= 0x10000) {
          var ch = utf32 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    };
  
  var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      maxBytesToWrite ??= 0x7FFFFFFF;
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
        }
        HEAP32[((outPtr)>>2)] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      // Null-terminate the pointer to the HEAP.
      HEAP32[((outPtr)>>2)] = 0;
      return outPtr - startPtr;
    };
  
  var lengthBytesUTF32 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
        len += 4;
      }
  
      return len;
    };
  var __embind_register_std_wstring = (rawType, charSize, name) => {
      name = readLatin1String(name);
      var decodeString, encodeString, readCharAt, lengthBytesUTF;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        readCharAt = (pointer) => HEAPU16[((pointer)>>1)];
      } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        readCharAt = (pointer) => HEAPU32[((pointer)>>2)];
      }
      registerType(rawType, {
        name,
        'fromWireType': (value) => {
          // Code mostly taken from _embind_register_std_string fromWireType
          var length = HEAPU32[((value)>>2)];
          var str;
  
          var decodeStartPtr = value + 4;
          // Looping here to support possible embedded '0' bytes
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = value + 4 + i * charSize;
            if (i == length || readCharAt(currentBytePtr) == 0) {
              var maxReadBytes = currentBytePtr - decodeStartPtr;
              var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
              if (str === undefined) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + charSize;
            }
          }
  
          _free(value);
  
          return str;
        },
        'toWireType': (destructors, value) => {
          if (!(typeof value == 'string')) {
            throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
          }
  
          // assumes POINTER_SIZE alignment
          var length = lengthBytesUTF(value);
          var ptr = _malloc(4 + length + charSize);
          HEAPU32[((ptr)>>2)] = length / charSize;
  
          encodeString(value, ptr + 4, length + charSize);
  
          if (destructors !== null) {
            destructors.push(_free, ptr);
          }
          return ptr;
        },
        'argPackAdvance': GenericWireTypeSize,
        'readValueFromPointer': readPointer,
        destructorFunction(ptr) {
          _free(ptr);
        }
      });
    };

  
  var __embind_register_void = (rawType, name) => {
      name = readLatin1String(name);
      registerType(rawType, {
        isVoid: true, // void return values can be optimized out sometimes
        name,
        'argPackAdvance': 0,
        'fromWireType': () => undefined,
        // TODO: assert if anything else is given?
        'toWireType': (destructors, o) => undefined,
      });
    };

  var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

  var getHeapMax = () =>
      HEAPU8.length;
  
  var abortOnCannotGrowMemory = (requestedSize) => {
      abort('OOM');
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };
embind_init_charCodes();
BindingError = Module['BindingError'] = class BindingError extends Error { constructor(message) { super(message); this.name = 'BindingError'; }};
InternalError = Module['InternalError'] = class InternalError extends Error { constructor(message) { super(message); this.name = 'InternalError'; }};
init_ClassHandle();
init_embind();;
init_RegisteredPointer();
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');;
init_emval();;
var wasmImports = {
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _embind_register_bigint: __embind_register_bigint,
  /** @export */
  _embind_register_bool: __embind_register_bool,
  /** @export */
  _embind_register_class: __embind_register_class,
  /** @export */
  _embind_register_class_constructor: __embind_register_class_constructor,
  /** @export */
  _embind_register_class_function: __embind_register_class_function,
  /** @export */
  _embind_register_emval: __embind_register_emval,
  /** @export */
  _embind_register_float: __embind_register_float,
  /** @export */
  _embind_register_integer: __embind_register_integer,
  /** @export */
  _embind_register_memory_view: __embind_register_memory_view,
  /** @export */
  _embind_register_std_string: __embind_register_std_string,
  /** @export */
  _embind_register_std_wstring: __embind_register_std_wstring,
  /** @export */
  _embind_register_void: __embind_register_void,
  /** @export */
  _emscripten_memcpy_js: __emscripten_memcpy_js,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap
};
var wasmExports = createWasm();
var ___wasm_call_ctors = wasmExports['__wasm_call_ctors']
var ___getTypeName = wasmExports['__getTypeName']
var _malloc = Module['_malloc'] = wasmExports['malloc']
var _free = wasmExports['free']
var __emscripten_stack_restore = wasmExports['_emscripten_stack_restore']
var __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc']
var _emscripten_stack_get_current = wasmExports['emscripten_stack_get_current']
var ___cxa_is_pointer_type = wasmExports['__cxa_is_pointer_type']


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===




var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function run() {

  if (runDependencies > 0) {
    return;
  }

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    Module['onRuntimeInitialized']?.();

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

run();

// end include: postamble.js

// include: /Users/davidg/Documents/GitHub/Substrata/c_audio/post-js.js
// need to call this to create a proper es6 export
export default Module;// end include: /Users/davidg/Documents/GitHub/Substrata/c_audio/post-js.js

