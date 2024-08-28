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
// include: /Users/davidg/Documents/GitHub/Substrata/c_audio/WASM/pre-js.js
import { Buffer } from 'buffer';

const atob = (a) => {
    return Buffer.from(a, 'base64').toString('binary');
};
// end include: /Users/davidg/Documents/GitHub/Substrata/c_audio/WASM/pre-js.js


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
    var f = 'data:application/octet-stream;base64,AGFzbQEAAAABjwInYAF/AX9gAX8AYAR/f39/AGAAAGACf38AYAN/f38AYAN/f38Bf2AGf39/f39/AGAFf39/f38AYAJ/fwF/YAN/fX8AYAABf2ABfQF9YAJ9fQF9YAJ/fQBgA399fQBgAX0Bf2ABfwF9YAF8AX1gBX9/f39/AX9gBn9/f39/fwF/YA1/f39/f39/f39/f39/AGAJf39/f39/f39/AGAKf319fX19fX19fQF9YAJ/fQF/YAN/f30AYAR/f31/AGAEf399fQBgA399fQF9YAV/fX1/fwF9YAJ/fQF9YAF/AXxgAnx/AX1gAnx/AXxgAXwBfGACfX8Bf2AEf39/fwF/YAV/f39+fgBgB39/f39/f38AAuEDEANlbnYNX19hc3NlcnRfZmFpbAACA2VudhZfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzABUDZW52Il9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IABwNlbnYfX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbgAWA2VudhVfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQABANlbnYVX2VtYmluZF9yZWdpc3Rlcl9ib29sAAIDZW52GF9lbWJpbmRfcmVnaXN0ZXJfaW50ZWdlcgAIA2VudhZfZW1iaW5kX3JlZ2lzdGVyX2Zsb2F0AAUDZW52G19lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZwAEA2VudhxfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nAAUDZW52Fl9lbWJpbmRfcmVnaXN0ZXJfZW12YWwAAQNlbnYcX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldwAFA2VudhVfZW1zY3JpcHRlbl9tZW1jcHlfanMABQNlbnYWZW1zY3JpcHRlbl9yZXNpemVfaGVhcAAAA2VudglfYWJvcnRfanMAAwNlbnYXX2VtYmluZF9yZWdpc3Rlcl9iaWdpbnQAJgN5eAMAAQMDCQIXAQEOBQoKCgoKDwQEAQEDAAEYAAgEAAkZAhobBQUDCRwdBg0QDRAMHgwREQ0AAAwfIBISISITIwwGAAALCwAABgEAAAMBBAMDAAsJAAEBAQEBAQYGAAYkBBQTFAICAgYGCQkIAggIBwcAAAELAQALJQQFAXABMDAFBgEBggKCAgYNAn8BQdDFBAt/AUEACwfLAQoGbWVtb3J5AgARX193YXNtX2NhbGxfY3RvcnMAEA1fX2dldFR5cGVOYW1lABEZX19pbmRpcmVjdF9mdW5jdGlvbl90YWJsZQEABm1hbGxvYwBWBGZyZWUAWBlfZW1zY3JpcHRlbl9zdGFja19yZXN0b3JlAIQBF19lbXNjcmlwdGVuX3N0YWNrX2FsbG9jAIUBHGVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2N1cnJlbnQAhgEVX19jeGFfaXNfcG9pbnRlcl90eXBlAIABCTUBAEEBCy8TJygpKhYrGCwZLS4aLxswHDEdHh8gITIiMyM0JCUmY2ZkZWpnbX99dGh+fHVpdwr8oAF4BgAQFBA1CwkAIAAoAgQQUQsVACAAQQAoArxBNgIEQQAgADYCvEEL5AMAQcQ+QZ0LEARB3D5B6glBAUEAEAVB6D5BkQlBAUGAf0H/ABAGQYA/QYoJQQFBgH9B/wAQBkH0PkGICUEBQQBB/wEQBkGMP0GrCEECQYCAfkH//wEQBkGYP0GiCEECQQBB//8DEAZBpD9BwAhBBEGAgICAeEH/////BxAGQbA/QbcIQQRBAEF/EAZBvD9BlApBBEGAgICAeEH/////BxAGQcg/QYsKQQRBAEF/EAZB1D9B2ghBCEKAgICAgICAgIB/Qv///////////wAQhwFB4D9B2QhBCEIAQn8QhwFB7D9B0whBBBAHQfg/QY4LQQgQB0GcF0GmChAIQeQXQdwPEAhBrBhBBEGZChAJQfgYQQJBsgoQCUHEGUEEQcEKEAlB4BkQCkGIGkEAQZcPEAtBsBpBAEH9DxALQdgaQQFBtQ8QC0GAG0ECQeQLEAtBqBtBA0GDDBALQdAbQQRBqwwQC0H4G0EFQcgMEAtBoBxBBEGiEBALQcgcQQVBwBAQC0GwGkEAQa4NEAtB2BpBAUGNDRALQYAbQQJB8A0QC0GoG0EDQc4NEAtB0BtBBEH2DhALQfgbQQVB1A4QC0HwHEEIQbMOEAtBmB1BCUGRDhALQcAdQQZB7gwQC0HoHUEHQecQEAsLKgBBAEEBNgLAQUEAQQA2AsRBEBNBAEEAKAK8QTYCxEFBAEHAwQA2ArxBC5EEAQZ/IABCADcCmAMgAEGoA2pCADcCACAAQbwDaiICQgA3AgAgAEG0A2oiA0IANwIAIABCADcCOCAAQgA3AgAgAEIANwIcIABCgICAgIABNwJAIABCADcCoAMgAEEIaiIEQgA3AgAgAEEQaiIFQgA3AgAgAEEYakEAOwEAIABBJGpCADcCACAAQSxqQgA3AgAgAEGAgID8AzYCnAMgAEHEA2oiBkEANgIAIABCADcCrAMgAkEANgIAIANBgICA/AM2AgAgAEEANgK4AyAAQdQDakIANwIAIABBzANqQgA3AgAgBkIANwIAAkAgAUUNACAAIAEQNhogBCABEDYaIAUgARA2GiAAQgA3AkggACABNgI0IABB0ABqQgA3AgAgAEHYAmohAyAAQZgCaiEGIABB2AFqIQQgAEGYAWohBSAAQdgAaiEHQQAhAQNAIAcgASICQQJ0IgFqQYCAoJIENgIAIAUgAWpBgICA/AM2AgAgBCABakHNmbPuAzYCACAGIAFqQYCAgPwDNgIAIAMgAWpBADYCACACQQFqIgIhASACQRBHDQALIABBADYC2AMgAELNmbPuAzcC0AMgAEKAgKCSBDcCyAMgAELvpIzU48CYvsIANwKYAyAAQpfuxsaDgJCOxgA3ArADIABBADYCrAMgAELvpIzU883EwTo3AqADIAAPC0GPEUHHCUEJQe8JEAAAC8EFAgZ9Cn8CQCAALQAYDQAgAUEAIAIgA2xBAnQQORoPCwJAIAJFDQBEAAAAAAAA8D8gACgCNLijtiEEIABB2AJqIQogAEGYAmohCyAAQdgBaiEMIABBmAFqIQ0gAEHYAGohDiAAQcgAaiEPQQAhEANAIBAhEQJAAkAgAC0AGUEBRw0AIAAoAihBBUshEAwBCyAAKgIkIAAqAjCTIAAqAjxeIRALAkAgEEUNAAJAIA8gACgCQCIQai0AAEEBRw0AIABBADYCLCAAQgA3AiQgACAOIBBBAnQiEmoqAgA4AsgDIABDAAAgQSANIBJqKgIAQwAAgEGUQwAAgMGSQwAAoEGVEEM4AswDIAAgDCASaioCACAAKgI8lDgC0AMgACALIBJqKgIAOALUAyAAQwAAIEEgCiASaioCAEMAABBClEMAAMDBkkMAAKBBlRBDOALYAwsgACAAKgIkOAIwIAAgEEEBaiAAKAJEbzYCQAsgACAAKgKgAyIFIAAqAqgDIgaSOAKgAyAAIAAqArgDIgcgACoCwAMiCJI4ArgDAkACQCAAKAKsA0F/arJDAAAAABA6IgmLQwAAAE9dRQ0AIAmoIRAMAQtBgICAgHghEAsgACAQIhA2AqwDAkACQCAAKALEA0F/arJDAAAAABA6IgmLQwAAAE9dRQ0AIAmoIRIMAQtBgICAgHghEgsgACASIhI2AsQDIAAgBiAQskMAAIA/lpQ4AqgDIAAgCCASskMAAIA/lpQ4AsADIAAgACoCJCAAKgIsIAAqAsgDIAAqAswDIAAqAtADIAAqAtQDIAAqAtgDIAUgBxAXIQUCQCADRQ0AIAEgEUECdGohE0EAIRADQCATIBAiECACbEECdGogBTgCACAQQQFqIhIhECASIANHDQALCyAAIAAqAiQgBJI4AiQgEUEBaiISIRAgEiACRw0ACwsL7QICAX8BfSMAQRBrIgokAAJAAkAgBUMAAAAAXkUNACABIAKTQxe30TiVQwAAgD8QPEMAAAAAEDohCyAAQwAAgD8gASACQxe30TiSkyIBIAWVQwAAgD8QPEMAAAAAEDqTIgIgAiALIAsgBJSUlJQgACoCHCICk0PNzMw9lCACkjgCHCAFQwAAAD+UIgVDAAAAAF5FDQEgAEMAAIA/IAEgBZVDAACAPxA8QwAAAAAQOpMiBSAFIAsgCyADQwAAQEGUIAaUlJSUlCAAKgIgIguTQ83MzD2UIAuSIgs4AiAgAEEIaiADu0QfhetRuB7xP6K2QwAAAAAQNyEFIABBEGogCUMAAAAAEDchAiAKQQhqQQAoAvgdNgIAIApBACkC8B03AwAgACoCHCEBIAAgCyADkiAHIAWUIAIgCJSSIApBAxA4IQsgCkEQaiQAIAEgC5QPC0GaFkGWCUEpQZkIEAAAC0GaFkGWCUEpQZkIEAAACyIAIABBADYCJCAAQQE6ABggAEEANgJAIABCgICA/As3AiwLCQAgAEEAOgAYC0cAAkAgAUMAAAAAXg0AQYcRQccJQeQAQckLEAAACyAAIAFDAACWQxA8QwAAIEKXIgE4AjggAEMAAHBCIAFDAACAQJSVOAI8CykAAkAgAkEQSQ0AQeoIQccJQfwAQdAKEAAACyAAIAJqQcgAaiABOgAAC2IAAkACQCACQRBPDQAgAUMAAKBBYEUNASABQwBAnEVfRQ0BIAAgAkECdGpB2ABqIAFDAECcRRA8QwAAoEGXOAIADwtB6ghBxwlBgQFBjAgQAAALQdEVQccJQYMBQYwIEAAAC2MAAkACQCACQRBPDQAgAUMAAAAAYEUNASABQwAAgD9fRQ0BIAAgAkECdGpBmAFqIAFDAACAPxA8QwAAAAAQOjgCAA8LQeoIQccJQYgBQYAIEAAAC0GZFEHHCUGJAUGACBAAAAtiAAJAAkAgAkEQTw0AIAFDAAAAAGBFDQEgAUMAAIBAX0UNASAAIAJBAnRqQdgBaiABQwAAgEAQPEMXt9E4lzgCAA8LQeoIQccJQY4BQd4JEAAAC0HZE0HHCUGPAUHeCRAAAAtjAAJAAkAgAkEQTw0AIAFDAAAAAGBFDQEgAUMAAIA/X0UNASAAIAJBAnRqQZgCaiABQwAAgD8QPEMAAAAAEDo4AgAPC0HqCEHHCUGUAUGVCxAAAAtBlRVBxwlBlQFBlQsQAAALYwACQAJAIAJBEE8NACABQwAAAABgRQ0BIAFDAACAP19FDQEgACACQQJ0akHYAmogAUMAAIA/EDxDAAAAABA6OAIADwtB6ghBxwlBmgFBhgsQAAALQdkUQccJQZsBQYYLEAAAC5MCAAJAAkACQAJAIAJDAAAAAGBFDQAgAkMAQBxGX0UNACABQwAAcMJgRQ0BIAFDAAAQQl9FDQEgACoCmANDAAAgQSABQwAAoEGVEEMiAV9FDQIgACoCnAMgAWBFDQIgACABOAKkAyAAQYABNgKsAyAAIAEgACoCoAOTQwAAADyUOAKoAyACQwBAHEYQPCECIAAqArADIAJDF7fROJciAl9FDQMgACoCtAMgAmBFDQMgACACOAK8AyAAQYABNgLEAyAAIAIgACoCuAOTQwAAADyUOALAAw8LQZ8RQccJQaEBQdALEAAAC0GBE0HHCUGjAUHQCxAAAAtBogtBqAlBH0HjChAAAAtBogtBqAlBH0HjChAAAAslAAJAIAFBf2pBEEkNAEHuEUHHCUGsAUH5CRAAAAsgACABNgJECwkAIAAgAToAGQsPACAAIAAoAihBAWo2AigLCQAgAEEANgIoC9kFAQF/QYgeQZweQbweQQBBzB5BAkHPHkEAQc8eQQBB7wlB0R5BAxABQYgeQQJB1B5B3B5BBEEFEAJBCBBZIgBBADYCBCAAQQY2AgBBiB5B4ghBBUHgHkH0HkEHIABBAEEAEANBCBBZIgBBADYCBCAAQQg2AgBBiB5BsQhBAkH8HkGEH0EJIABBAEEAEANBCBBZIgBBADYCBCAAQQo2AgBBiB5B0QlBAkH8HkGEH0EJIABBAEEAEANBCBBZIgBBADYCBCAAQQs2AgBBiB5B1glBAkGIH0GQH0EMIABBAEEAEANBCBBZIgBBADYCBCAAQQ02AgBBiB5ByQtBA0GUH0GgH0EOIABBAEEAEANBCBBZIgBBADYCBCAAQQ82AgBBiB5B0ApBBEGwH0HAH0EQIABBAEEAEANBCBBZIgBBADYCBCAAQRE2AgBBiB5BjAhBBEHQH0HgH0ESIABBAEEAEANBCBBZIgBBADYCBCAAQRM2AgBBiB5BgAhBBEHQH0HgH0ESIABBAEEAEANBCBBZIgBBADYCBCAAQRQ2AgBBiB5B3glBBEHQH0HgH0ESIABBAEEAEANBCBBZIgBBADYCBCAAQRU2AgBBiB5BlQtBBEHQH0HgH0ESIABBAEEAEANBCBBZIgBBADYCBCAAQRY2AgBBiB5BhgtBBEHQH0HgH0ESIABBAEEAEANBCBBZIgBBADYCBCAAQRc2AgBBiB5B0AtBBEHwH0GAIEEYIABBAEEAEANBCBBZIgBBADYCBCAAQRk2AgBBiB5B+QlBA0GIIEGUIEEaIABBAEEAEANBCBBZIgBBADYCBCAAQRs2AgBBiB5B3AtBA0GcIEGUIEEcIABBAEEAEANBCBBZIgBBADYCBCAAQR02AgBBiB5B9wpBAkH8HkGEH0EJIABBAEEAEANBCBBZIgBBADYCBCAAQR42AgBBiB5BxAhBAkH8HkGEH0EJIABBAEEAEAMLBQBBiB4LEQACQCAARQ0AIABB3AMQXQsLKQEBfyMAQRBrIgIkACACIAE4AgwgAkEMaiAAEQAAIQAgAkEQaiQAIAALPQIBfwF9QdwDEFkhAQJAAkAgACoCACICQwAAgE9dIAJDAAAAAGBxRQ0AIAKpIQAMAQtBACEACyABIAAQFQtIAQF/IAEgACgCBCIFQQF1aiEBIAAoAgAhAAJAAkAgBUEBcUUNACABKAIAIABqKAIAIQAMAQsgACEACyABIAIgAyAEIAARAgALQgEBfyABIAAoAgQiAkEBdWohASAAKAIAIQACQAJAIAJBAXFFDQAgASgCACAAaigCACEADAELIAAhAAsgASAAEQEACwcAIAAoAkALQgEBfyABIAAoAgQiAkEBdWohASAAKAIAIQACQAJAIAJBAXFFDQAgASgCACAAaigCACEADAELIAAhAAsgASAAEQAAC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQ4AC0YBAX8gASAAKAIEIgRBAXVqIQEgACgCACEAAkACQCAEQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiADIAARBQALRgEBfyABIAAoAgQiBEEBdWohASAAKAIAIQACQAJAIARBAXFFDQAgASgCACAAaigCACEADAELIAAhAAsgASACIAMgABEKAAtGAQF/IAEgACgCBCIEQQF1aiEBIAAoAgAhAAJAAkAgBEEBcUUNACABKAIAIABqKAIAIQAMAQsgACEACyABIAIgAyAAEQ8AC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQQAC0QBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAAkACQCADQQFxRQ0AIAEoAgAgAGooAgAhAAwBCyAAIQALIAEgAiAAEQQACxoAQQBBHzYCyEFBAEEANgLMQRAmQcjBABASCyAAAkAgAQ0AQdYSQbgJQQdB2AoQAAALIAAgATYCAEEBCysAIAAgACoCBCABIAAoAgCzlZIiASABj5MiATgCBCABQ9sPyUCUIAKSEE8LgAECAn0CfwJAAkAgBA0AQwAAAAAhBQwBCyAAKgIEQ9sPyUCUIAKSEE8hBkMAAAAAIQJBACEHA0AgAyAHIgdBAnRqKgIAIAaUIAKSIgIhBSACIQIgB0EBaiIIIQcgCCAERw0ACwsgACAAKgIEIAEgACgCALOVkiICIAKPkzgCBCAFC/ICAgN/AX4CQCACRQ0AIAAgAToAACAAIAJqIgNBf2ogAToAACACQQNJDQAgACABOgACIAAgAToAASADQX1qIAE6AAAgA0F+aiABOgAAIAJBB0kNACAAIAE6AAMgA0F8aiABOgAAIAJBCUkNACAAQQAgAGtBA3EiBGoiAyABQf8BcUGBgoQIbCIBNgIAIAMgAiAEa0F8cSIEaiICQXxqIAE2AgAgBEEJSQ0AIAMgATYCCCADIAE2AgQgAkF4aiABNgIAIAJBdGogATYCACAEQRlJDQAgAyABNgIYIAMgATYCFCADIAE2AhAgAyABNgIMIAJBcGogATYCACACQWxqIAE2AgAgAkFoaiABNgIAIAJBZGogATYCACAEIANBBHFBGHIiBWsiAkEgSQ0AIAGtQoGAgIAQfiEGIAMgBWohAQNAIAEgBjcDGCABIAY3AxAgASAGNwMIIAEgBjcDACABQSBqIQEgAkFgaiICQR9LDQALCyAACzcAAkAgABA7Qf////8HcUGAgID8B0sNACAAIAAgAZcgARA7Qf////8HcUGAgID8B0sbIQELIAELBQAgALwLNwACQCAAED1B/////wdxQYCAgPwHSw0AIAAgACABliABED1B/////wdxQYCAgPwHSxshAQsgAQsFACAAvAsMACAAIACTIgAgAJULDwAgAYwgASAAGxBAIAGUCxUBAX8jAEEQayIBIAA4AgwgASoCDAsLACAAQwAAAHAQPwsLACAAQwAAABAQPwubAwMEfwF9AXwgAbwiAhBEIQMCQAJAAkACQAJAIAC8IgRBgICAhHhqQYCAgIh4SQ0AQQAhBSADDQEMAwsgA0UNAQtDAACAPyEGIARBgICA/ANGDQIgAkEBdCIDRQ0CAkACQCAEQQF0IgRBgICAeEsNACADQYGAgHhJDQELIAAgAZIPCyAEQYCAgPgHRg0CQwAAAAAgASABlCAEQYCAgPgHSSACQQBIcxsPCwJAIAQQREUNACAAIACUIQYCQCAEQX9KDQAgBowgBiACEEVBAUYbIQYLIAJBf0oNAkMAAIA/IAaVEEYPC0EAIQUCQCAEQX9KDQACQCACEEUiAw0AIAAQPg8LIAC8Qf////8HcSEEIANBAUZBEHQhBQsgBEH///8DSw0AIABDAAAAS5S8Qf////8HcUGAgICkf2ohBAsCQCAEEEcgAbuiIge9QoCAgICAgOD//wCDQoGAgICAgMCvwABUDQACQCAHRHHV0f///19AZEUNACAFEEEPCyAHRAAAAAAAwGLAZUUNACAFEEIPCyAHIAUQSCEGCyAGCxMAIABBAXRBgICACGpBgYCACEkLTQECf0EAIQECQCAAQRd2Qf8BcSICQf8ASQ0AQQIhASACQZYBSw0AQQAhAUEBQZYBIAJrdCICQX9qIABxDQBBAUECIAIgAHEbIQELIAELFQEBfyMAQRBrIgEgADgCDCABKgIMC4MBAgF/AnxBACsD8CQgACAAQYCAtIZ8aiIBQYCAgHxxa767IAFBD3ZB8AFxIgBB8CJqKwMAokQAAAAAAADwv6AiAqJBACsD+CSgIAIgAqIiAyADoqJBACsDgCUgAqJBACsDiCWgIAOiQQArA5AlIAKiIABB+CJqKwMAIAFBF3W3oKCgoAtjAgJ8AX5BACsDsCIgAEEAKwOoIiICIACgIgMgAqGhIgCiQQArA7gioCAAIACiokEAKwPAIiAAokQAAAAAAADwP6CgIAO9IgQgAa18Qi+GIASnQR9xQQN0QaggaikDAHy/orYLSwECfCAAIACiIgEgAKIiAiABIAGioiABRKdGO4yHzcY+okR058ri+QAqv6CiIAIgAUSy+26JEBGBP6JEd6zLVFVVxb+goiAAoKC2C08BAXwgACAAoiIAIAAgAKIiAaIgAERpUO7gQpP5PqJEJx4P6IfAVr+goiABREI6BeFTVaU/oiAARIFeDP3//9+/okQAAAAAAADwP6CgoLYLrgEAAkACQCABQYAISA0AIABEAAAAAAAA4H+iIQACQCABQf8PTw0AIAFBgXhqIQEMAgsgAEQAAAAAAADgf6IhACABQf0XIAFB/RdJG0GCcGohAQwBCyABQYF4Sg0AIABEAAAAAAAAYAOiIQACQCABQbhwTQ0AIAFByQdqIQEMAQsgAEQAAAAAAABgA6IhACABQfBoIAFB8GhLG0GSD2ohAQsgACABQf8Haq1CNIa/ogsFACAAnAvTEgIQfwN8IwBBsARrIgUkACACQX1qQRhtIgZBACAGQQBKGyIHQWhsIAJqIQgCQCAEQQJ0QaAlaigCACIJIANBf2oiCmpBAEgNACAJIANqIQsgByAKayECQQAhBgNAAkACQCACQQBODQBEAAAAAAAAAAAhFQwBCyACQQJ0QbAlaigCALchFQsgBUHAAmogBkEDdGogFTkDACACQQFqIQIgBkEBaiIGIAtHDQALCyAIQWhqIQxBACELIAlBACAJQQBKGyENIANBAUghDgNAAkACQCAORQ0ARAAAAAAAAAAAIRUMAQsgCyAKaiEGQQAhAkQAAAAAAAAAACEVA0AgACACQQN0aisDACAFQcACaiAGIAJrQQN0aisDAKIgFaAhFSACQQFqIgIgA0cNAAsLIAUgC0EDdGogFTkDACALIA1GIQIgC0EBaiELIAJFDQALQS8gCGshD0EwIAhrIRAgCEFnaiERIAkhCwJAA0AgBSALQQN0aisDACEVQQAhAiALIQYCQCALQQFIIhINAANAAkACQCAVRAAAAAAAAHA+oiIWmUQAAAAAAADgQWNFDQAgFqohDQwBC0GAgICAeCENCyAFQeADaiACQQJ0aiEOAkACQCANtyIWRAAAAAAAAHDBoiAVoCIVmUQAAAAAAADgQWNFDQAgFaohDQwBC0GAgICAeCENCyAOIA02AgAgBSAGQX9qIgZBA3RqKwMAIBagIRUgAkEBaiICIAtHDQALCyAVIAwQSyEVAkACQCAVIBVEAAAAAAAAwD+iEExEAAAAAAAAIMCioCIVmUQAAAAAAADgQWNFDQAgFaohCgwBC0GAgICAeCEKCyAVIAq3oSEVAkACQAJAAkACQCAMQQFIIhMNACALQQJ0IAVB4ANqakF8aiICIAIoAgAiAiACIBB1IgIgEHRrIgY2AgAgBiAPdSEUIAIgCmohCgwBCyAMDQEgC0ECdCAFQeADampBfGooAgBBF3UhFAsgFEEBSA0CDAELQQIhFCAVRAAAAAAAAOA/Zg0AQQAhFAwBC0EAIQJBACENAkAgEg0AA0AgBUHgA2ogAkECdGoiDigCACEGAkACQAJAAkAgDUUNAEH///8HIQ0MAQsgBkUNAUGAgIAIIQ0LIA4gDSAGazYCAEEBIQ0MAQtBACENCyACQQFqIgIgC0cNAAsLAkAgEw0AQf///wMhAgJAAkAgEQ4CAQACC0H///8BIQILIAtBAnQgBUHgA2pqQXxqIgYgBigCACACcTYCAAsgCkEBaiEKIBRBAkcNAEQAAAAAAADwPyAVoSEVQQIhFCANRQ0AIBVEAAAAAAAA8D8gDBBLoSEVCwJAIBVEAAAAAAAAAABiDQBBACEGIAshAgJAIAsgCUwNAANAIAVB4ANqIAJBf2oiAkECdGooAgAgBnIhBiACIAlKDQALIAZFDQAgDCEIA0AgCEFoaiEIIAVB4ANqIAtBf2oiC0ECdGooAgBFDQAMBAsAC0EBIQIDQCACIgZBAWohAiAFQeADaiAJIAZrQQJ0aigCAEUNAAsgBiALaiENA0AgBUHAAmogCyADaiIGQQN0aiALQQFqIgsgB2pBAnRBsCVqKAIAtzkDAEEAIQJEAAAAAAAAAAAhFQJAIANBAUgNAANAIAAgAkEDdGorAwAgBUHAAmogBiACa0EDdGorAwCiIBWgIRUgAkEBaiICIANHDQALCyAFIAtBA3RqIBU5AwAgCyANSA0ACyANIQsMAQsLAkACQCAVQRggCGsQSyIVRAAAAAAAAHBBZkUNACALQQJ0IQMCQAJAIBVEAAAAAAAAcD6iIhaZRAAAAAAAAOBBY0UNACAWqiECDAELQYCAgIB4IQILIAVB4ANqIANqIQMCQAJAIAK3RAAAAAAAAHDBoiAVoCIVmUQAAAAAAADgQWNFDQAgFaohBgwBC0GAgICAeCEGCyADIAY2AgAgC0EBaiELDAELAkACQCAVmUQAAAAAAADgQWNFDQAgFaohAgwBC0GAgICAeCECCyAMIQgLIAVB4ANqIAtBAnRqIAI2AgALRAAAAAAAAPA/IAgQSyEVAkAgC0F/TA0AIAshAwNAIAUgAyICQQN0aiAVIAVB4ANqIAJBAnRqKAIAt6I5AwAgAkF/aiEDIBVEAAAAAAAAcD6iIRUgAg0ACyALQX9MDQAgCyEGA0BEAAAAAAAAAAAhFUEAIQICQCAJIAsgBmsiDSAJIA1IGyIAQQBIDQADQCACQQN0QYA7aisDACAFIAIgBmpBA3RqKwMAoiAVoCEVIAIgAEchAyACQQFqIQIgAw0ACwsgBUGgAWogDUEDdGogFTkDACAGQQBKIQIgBkF/aiEGIAINAAsLAkACQAJAAkACQCAEDgQBAgIABAtEAAAAAAAAAAAhFwJAIAtBAUgNACAFQaABaiALQQN0aisDACEVIAshAgNAIAVBoAFqIAJBA3RqIBUgBUGgAWogAkF/aiIDQQN0aiIGKwMAIhYgFiAVoCIWoaA5AwAgBiAWOQMAIAJBAUshBiAWIRUgAyECIAYNAAsgC0EBRg0AIAVBoAFqIAtBA3RqKwMAIRUgCyECA0AgBUGgAWogAkEDdGogFSAFQaABaiACQX9qIgNBA3RqIgYrAwAiFiAWIBWgIhahoDkDACAGIBY5AwAgAkECSyEGIBYhFSADIQIgBg0AC0QAAAAAAAAAACEXIAtBAUYNAANAIBcgBUGgAWogC0EDdGorAwCgIRcgC0ECSiECIAtBf2ohCyACDQALCyAFKwOgASEVIBQNAiABIBU5AwAgBSsDqAEhFSABIBc5AxAgASAVOQMIDAMLRAAAAAAAAAAAIRUCQCALQQBIDQADQCALIgJBf2ohCyAVIAVBoAFqIAJBA3RqKwMAoCEVIAINAAsLIAEgFZogFSAUGzkDAAwCC0QAAAAAAAAAACEVAkAgC0EASA0AIAshAwNAIAMiAkF/aiEDIBUgBUGgAWogAkEDdGorAwCgIRUgAg0ACwsgASAVmiAVIBQbOQMAIAUrA6ABIBWhIRVBASECAkAgC0EBSA0AA0AgFSAFQaABaiACQQN0aisDAKAhFSACIAtHIQMgAkEBaiECIAMNAAsLIAEgFZogFSAUGzkDCAwBCyABIBWaOQMAIAUrA6gBIRUgASAXmjkDECABIBWaOQMICyAFQbAEaiQAIApBB3ELogMCBH8DfCMAQRBrIgIkAAJAAkAgALwiA0H/////B3EiBEHan6TuBEsNACABIAC7IgYgBkSDyMltMF/kP6JEAAAAAAAAOEOgRAAAAAAAADjDoCIHRAAAAFD7Ifm/oqAgB0RjYhphtBBRvqKgIgg5AwAgCEQAAABg+yHpv2MhAwJAAkAgB5lEAAAAAAAA4EFjRQ0AIAeqIQQMAQtBgICAgHghBAsCQCADRQ0AIAEgBiAHRAAAAAAAAPC/oCIHRAAAAFD7Ifm/oqAgB0RjYhphtBBRvqKgOQMAIARBf2ohBAwCCyAIRAAAAGD7Iek/ZEUNASABIAYgB0QAAAAAAADwP6AiB0QAAABQ+yH5v6KgIAdEY2IaYbQQUb6ioDkDACAEQQFqIQQMAQsCQCAEQYCAgPwHSQ0AIAEgACAAk7s5AwBBACEEDAELIAIgBCAEQRd2Qep+aiIFQRd0a767OQMIIAJBCGogAiAFQQFBABBNIQQgAisDACEHAkAgA0F/Sg0AIAEgB5o5AwBBACAEayEEDAELIAEgBzkDAAsgAkEQaiQAIAQLjgMCA38BfCMAQRBrIgEkAAJAAkAgALwiAkH/////B3EiA0Han6T6A0sNACADQYCAgMwDSQ0BIAC7EEkhAAwBCwJAIANB0aftgwRLDQAgALshBAJAIANB45fbgARLDQACQCACQX9KDQAgBEQYLURU+yH5P6AQSowhAAwDCyAERBgtRFT7Ifm/oBBKIQAMAgtEGC1EVPshCcBEGC1EVPshCUAgAkF/ShsgBKCaEEkhAAwBCwJAIANB1eOIhwRLDQACQCADQd/bv4UESw0AIAC7IQQCQCACQX9KDQAgBETSITN/fNkSQKAQSiEADAMLIARE0iEzf3zZEsCgEEqMIQAMAgtEGC1EVPshGUBEGC1EVPshGcAgAkEASBsgALugEEkhAAwBCwJAIANBgICA/AdJDQAgACAAkyEADAELIAAgAUEIahBOIQMgASsDCCEEAkACQAJAAkAgA0EDcQ4EAAECAwALIAQQSSEADAMLIAQQSiEADAILIASaEEkhAAwBCyAEEEqMIQALIAFBEGokACAAC5AEAQN/AkAgAkGABEkNACAAIAEgAhAMIAAPCyAAIAJqIQMCQAJAIAEgAHNBA3ENAAJAAkAgAEEDcQ0AIAAhAgwBCwJAIAINACAAIQIMAQsgACECA0AgAiABLQAAOgAAIAFBAWohASACQQFqIgJBA3FFDQEgAiADSQ0ACwsgA0F8cSEEAkAgA0HAAEkNACACIARBQGoiBUsNAANAIAIgASgCADYCACACIAEoAgQ2AgQgAiABKAIINgIIIAIgASgCDDYCDCACIAEoAhA2AhAgAiABKAIUNgIUIAIgASgCGDYCGCACIAEoAhw2AhwgAiABKAIgNgIgIAIgASgCJDYCJCACIAEoAig2AiggAiABKAIsNgIsIAIgASgCMDYCMCACIAEoAjQ2AjQgAiABKAI4NgI4IAIgASgCPDYCPCABQcAAaiEBIAJBwABqIgIgBU0NAAsLIAIgBE8NAQNAIAIgASgCADYCACABQQRqIQEgAkEEaiICIARJDQAMAgsACwJAIANBBE8NACAAIQIMAQsCQCADQXxqIgQgAE8NACAAIQIMAQsgACECA0AgAiABLQAAOgAAIAIgAS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLAkAgAiADTw0AA0AgAiABLQAAOgAAIAFBAWohASACQQFqIgIgA0cNAAsLIAALIQECfwJAIAAQUkEBaiIBEFYiAg0AQQAPCyACIAAgARBQC4gBAQN/IAAhAQJAAkAgAEEDcUUNAAJAIAAtAAANACAAIABrDwsgACEBA0AgAUEBaiIBQQNxRQ0BIAEtAAANAAwCCwALA0AgASICQQRqIQFBgIKECCACKAIAIgNrIANyQYCBgoR4cUGAgYKEeEYNAAsDQCACIgFBAWohAiABLQAADQALCyABIABrCwcAPwBBEHQLBgBB0MEAC08BAn9BACgCuEEiASAAQQdqQXhxIgJqIQACQAJAAkAgAkUNACAAIAFNDQELIAAQU00NASAAEA0NAQsQVEEwNgIAQX8PC0EAIAA2ArhBIAEL8iEBC38jAEEQayIBJAACQAJAAkACQAJAAkACQAJAAkACQAJAIABB9AFLDQACQEEAKALUQSICQRAgAEELakH4A3EgAEELSRsiA0EDdiIEdiIAQQNxRQ0AAkACQCAAQX9zQQFxIARqIgNBA3QiBEH8wQBqIgAgBEGEwgBqKAIAIgQoAggiBUcNAEEAIAJBfiADd3E2AtRBDAELIAUgADYCDCAAIAU2AggLIARBCGohACAEIANBA3QiA0EDcjYCBCAEIANqIgQgBCgCBEEBcjYCBAwLCyADQQAoAtxBIgZNDQECQCAARQ0AAkACQCAAIAR0QQIgBHQiAEEAIABrcnFoIgRBA3QiAEH8wQBqIgUgAEGEwgBqKAIAIgAoAggiB0cNAEEAIAJBfiAEd3EiAjYC1EEMAQsgByAFNgIMIAUgBzYCCAsgACADQQNyNgIEIAAgA2oiByAEQQN0IgQgA2siA0EBcjYCBCAAIARqIAM2AgACQCAGRQ0AIAZBeHFB/MEAaiEFQQAoAuhBIQQCQAJAIAJBASAGQQN2dCIIcQ0AQQAgAiAIcjYC1EEgBSEIDAELIAUoAgghCAsgBSAENgIIIAggBDYCDCAEIAU2AgwgBCAINgIICyAAQQhqIQBBACAHNgLoQUEAIAM2AtxBDAsLQQAoAthBIglFDQEgCWhBAnRBhMQAaigCACIHKAIEQXhxIANrIQQgByEFAkADQAJAIAUoAhAiAA0AIAUoAhQiAEUNAgsgACgCBEF4cSADayIFIAQgBSAESSIFGyEEIAAgByAFGyEHIAAhBQwACwALIAcoAhghCgJAIAcoAgwiACAHRg0AIAcoAggiBSAANgIMIAAgBTYCCAwKCwJAAkAgBygCFCIFRQ0AIAdBFGohCAwBCyAHKAIQIgVFDQMgB0EQaiEICwNAIAghCyAFIgBBFGohCCAAKAIUIgUNACAAQRBqIQggACgCECIFDQALIAtBADYCAAwJC0F/IQMgAEG/f0sNACAAQQtqIgRBeHEhA0EAKALYQSIKRQ0AQR8hBgJAIABB9P//B0sNACADQSYgBEEIdmciAGt2QQFxIABBAXRrQT5qIQYLQQAgA2shBAJAAkACQAJAIAZBAnRBhMQAaigCACIFDQBBACEAQQAhCAwBC0EAIQAgA0EAQRkgBkEBdmsgBkEfRht0IQdBACEIA0ACQCAFKAIEQXhxIANrIgIgBE8NACACIQQgBSEIIAINAEEAIQQgBSEIIAUhAAwDCyAAIAUoAhQiAiACIAUgB0EddkEEcWpBEGooAgAiC0YbIAAgAhshACAHQQF0IQcgCyEFIAsNAAsLAkAgACAIcg0AQQAhCEECIAZ0IgBBACAAa3IgCnEiAEUNAyAAaEECdEGExABqKAIAIQALIABFDQELA0AgACgCBEF4cSADayICIARJIQcCQCAAKAIQIgUNACAAKAIUIQULIAIgBCAHGyEEIAAgCCAHGyEIIAUhACAFDQALCyAIRQ0AIARBACgC3EEgA2tPDQAgCCgCGCELAkAgCCgCDCIAIAhGDQAgCCgCCCIFIAA2AgwgACAFNgIIDAgLAkACQCAIKAIUIgVFDQAgCEEUaiEHDAELIAgoAhAiBUUNAyAIQRBqIQcLA0AgByECIAUiAEEUaiEHIAAoAhQiBQ0AIABBEGohByAAKAIQIgUNAAsgAkEANgIADAcLAkBBACgC3EEiACADSQ0AQQAoAuhBIQQCQAJAIAAgA2siBUEQSQ0AIAQgA2oiByAFQQFyNgIEIAQgAGogBTYCACAEIANBA3I2AgQMAQsgBCAAQQNyNgIEIAQgAGoiACAAKAIEQQFyNgIEQQAhB0EAIQULQQAgBTYC3EFBACAHNgLoQSAEQQhqIQAMCQsCQEEAKALgQSIHIANNDQBBACAHIANrIgQ2AuBBQQBBACgC7EEiACADaiIFNgLsQSAFIARBAXI2AgQgACADQQNyNgIEIABBCGohAAwJCwJAAkBBACgCrEVFDQBBACgCtEUhBAwBC0EAQn83ArhFQQBCgKCAgICABDcCsEVBACABQQxqQXBxQdiq1aoFczYCrEVBAEEANgLARUEAQQA2ApBFQYAgIQQLQQAhACAEIANBL2oiBmoiAkEAIARrIgtxIgggA00NCEEAIQACQEEAKAKMRSIERQ0AQQAoAoRFIgUgCGoiCiAFTQ0JIAogBEsNCQsCQAJAQQAtAJBFQQRxDQACQAJAAkACQAJAQQAoAuxBIgRFDQBBlMUAIQADQAJAIAAoAgAiBSAESw0AIAUgACgCBGogBEsNAwsgACgCCCIADQALC0EAEFUiB0F/Rg0DIAghAgJAQQAoArBFIgBBf2oiBCAHcUUNACAIIAdrIAQgB2pBACAAa3FqIQILIAIgA00NAwJAQQAoAoxFIgBFDQBBACgChEUiBCACaiIFIARNDQQgBSAASw0ECyACEFUiACAHRw0BDAULIAIgB2sgC3EiAhBVIgcgACgCACAAKAIEakYNASAHIQALIABBf0YNAQJAIAIgA0EwakkNACAAIQcMBAsgBiACa0EAKAK0RSIEakEAIARrcSIEEFVBf0YNASAEIAJqIQIgACEHDAMLIAdBf0cNAgtBAEEAKAKQRUEEcjYCkEULIAgQVSEHQQAQVSEAIAdBf0YNBSAAQX9GDQUgByAATw0FIAAgB2siAiADQShqTQ0FC0EAQQAoAoRFIAJqIgA2AoRFAkAgAEEAKAKIRU0NAEEAIAA2AohFCwJAAkBBACgC7EEiBEUNAEGUxQAhAANAIAcgACgCACIFIAAoAgQiCGpGDQIgACgCCCIADQAMBQsACwJAAkBBACgC5EEiAEUNACAHIABPDQELQQAgBzYC5EELQQAhAEEAIAI2AphFQQAgBzYClEVBAEF/NgL0QUEAQQAoAqxFNgL4QUEAQQA2AqBFA0AgAEEDdCIEQYTCAGogBEH8wQBqIgU2AgAgBEGIwgBqIAU2AgAgAEEBaiIAQSBHDQALQQAgAkFYaiIAQXggB2tBB3EiBGsiBTYC4EFBACAHIARqIgQ2AuxBIAQgBUEBcjYCBCAHIABqQSg2AgRBAEEAKAK8RTYC8EEMBAsgBCAHTw0CIAQgBUkNAiAAKAIMQQhxDQIgACAIIAJqNgIEQQAgBEF4IARrQQdxIgBqIgU2AuxBQQBBACgC4EEgAmoiByAAayIANgLgQSAFIABBAXI2AgQgBCAHakEoNgIEQQBBACgCvEU2AvBBDAMLQQAhAAwGC0EAIQAMBAsCQCAHQQAoAuRBTw0AQQAgBzYC5EELIAcgAmohBUGUxQAhAAJAAkADQCAAKAIAIgggBUYNASAAKAIIIgANAAwCCwALIAAtAAxBCHFFDQMLQZTFACEAAkADQAJAIAAoAgAiBSAESw0AIAUgACgCBGoiBSAESw0CCyAAKAIIIQAMAAsAC0EAIAJBWGoiAEF4IAdrQQdxIghrIgs2AuBBQQAgByAIaiIINgLsQSAIIAtBAXI2AgQgByAAakEoNgIEQQBBACgCvEU2AvBBIAQgBUEnIAVrQQdxakFRaiIAIAAgBEEQakkbIghBGzYCBCAIQRBqQQApApxFNwIAIAhBACkClEU3AghBACAIQQhqNgKcRUEAIAI2AphFQQAgBzYClEVBAEEANgKgRSAIQRhqIQADQCAAQQc2AgQgAEEIaiEHIABBBGohACAHIAVJDQALIAggBEYNACAIIAgoAgRBfnE2AgQgBCAIIARrIgdBAXI2AgQgCCAHNgIAAkACQCAHQf8BSw0AIAdBeHFB/MEAaiEAAkACQEEAKALUQSIFQQEgB0EDdnQiB3ENAEEAIAUgB3I2AtRBIAAhBQwBCyAAKAIIIQULIAAgBDYCCCAFIAQ2AgxBDCEHQQghCAwBC0EfIQACQCAHQf///wdLDQAgB0EmIAdBCHZnIgBrdkEBcSAAQQF0a0E+aiEACyAEIAA2AhwgBEIANwIQIABBAnRBhMQAaiEFAkACQAJAQQAoAthBIghBASAAdCICcQ0AQQAgCCACcjYC2EEgBSAENgIAIAQgBTYCGAwBCyAHQQBBGSAAQQF2ayAAQR9GG3QhACAFKAIAIQgDQCAIIgUoAgRBeHEgB0YNAiAAQR12IQggAEEBdCEAIAUgCEEEcWpBEGoiAigCACIIDQALIAIgBDYCACAEIAU2AhgLQQghB0EMIQggBCEFIAQhAAwBCyAFKAIIIgAgBDYCDCAFIAQ2AgggBCAANgIIQQAhAEEYIQdBDCEICyAEIAhqIAU2AgAgBCAHaiAANgIAC0EAKALgQSIAIANNDQBBACAAIANrIgQ2AuBBQQBBACgC7EEiACADaiIFNgLsQSAFIARBAXI2AgQgACADQQNyNgIEIABBCGohAAwECxBUQTA2AgBBACEADAMLIAAgBzYCACAAIAAoAgQgAmo2AgQgByAIIAMQVyEADAILAkAgC0UNAAJAAkAgCCAIKAIcIgdBAnRBhMQAaiIFKAIARw0AIAUgADYCACAADQFBACAKQX4gB3dxIgo2AthBDAILIAtBEEEUIAsoAhAgCEYbaiAANgIAIABFDQELIAAgCzYCGAJAIAgoAhAiBUUNACAAIAU2AhAgBSAANgIYCyAIKAIUIgVFDQAgACAFNgIUIAUgADYCGAsCQAJAIARBD0sNACAIIAQgA2oiAEEDcjYCBCAIIABqIgAgACgCBEEBcjYCBAwBCyAIIANBA3I2AgQgCCADaiIHIARBAXI2AgQgByAEaiAENgIAAkAgBEH/AUsNACAEQXhxQfzBAGohAAJAAkBBACgC1EEiA0EBIARBA3Z0IgRxDQBBACADIARyNgLUQSAAIQQMAQsgACgCCCEECyAAIAc2AgggBCAHNgIMIAcgADYCDCAHIAQ2AggMAQtBHyEAAkAgBEH///8HSw0AIARBJiAEQQh2ZyIAa3ZBAXEgAEEBdGtBPmohAAsgByAANgIcIAdCADcCECAAQQJ0QYTEAGohAwJAAkACQCAKQQEgAHQiBXENAEEAIAogBXI2AthBIAMgBzYCACAHIAM2AhgMAQsgBEEAQRkgAEEBdmsgAEEfRht0IQAgAygCACEFA0AgBSIDKAIEQXhxIARGDQIgAEEddiEFIABBAXQhACADIAVBBHFqQRBqIgIoAgAiBQ0ACyACIAc2AgAgByADNgIYCyAHIAc2AgwgByAHNgIIDAELIAMoAggiACAHNgIMIAMgBzYCCCAHQQA2AhggByADNgIMIAcgADYCCAsgCEEIaiEADAELAkAgCkUNAAJAAkAgByAHKAIcIghBAnRBhMQAaiIFKAIARw0AIAUgADYCACAADQFBACAJQX4gCHdxNgLYQQwCCyAKQRBBFCAKKAIQIAdGG2ogADYCACAARQ0BCyAAIAo2AhgCQCAHKAIQIgVFDQAgACAFNgIQIAUgADYCGAsgBygCFCIFRQ0AIAAgBTYCFCAFIAA2AhgLAkACQCAEQQ9LDQAgByAEIANqIgBBA3I2AgQgByAAaiIAIAAoAgRBAXI2AgQMAQsgByADQQNyNgIEIAcgA2oiAyAEQQFyNgIEIAMgBGogBDYCAAJAIAZFDQAgBkF4cUH8wQBqIQVBACgC6EEhAAJAAkBBASAGQQN2dCIIIAJxDQBBACAIIAJyNgLUQSAFIQgMAQsgBSgCCCEICyAFIAA2AgggCCAANgIMIAAgBTYCDCAAIAg2AggLQQAgAzYC6EFBACAENgLcQQsgB0EIaiEACyABQRBqJAAgAAvbBwEHfyAAQXggAGtBB3FqIgMgAkEDcjYCBCABQXggAWtBB3FqIgQgAyACaiIFayEAAkACQCAEQQAoAuxBRw0AQQAgBTYC7EFBAEEAKALgQSAAaiICNgLgQSAFIAJBAXI2AgQMAQsCQCAEQQAoAuhBRw0AQQAgBTYC6EFBAEEAKALcQSAAaiICNgLcQSAFIAJBAXI2AgQgBSACaiACNgIADAELAkAgBCgCBCIBQQNxQQFHDQAgAUF4cSEGIAQoAgwhAgJAAkAgAUH/AUsNAAJAIAIgBCgCCCIHRw0AQQBBACgC1EFBfiABQQN2d3E2AtRBDAILIAcgAjYCDCACIAc2AggMAQsgBCgCGCEIAkACQCACIARGDQAgBCgCCCIBIAI2AgwgAiABNgIIDAELAkACQAJAIAQoAhQiAUUNACAEQRRqIQcMAQsgBCgCECIBRQ0BIARBEGohBwsDQCAHIQkgASICQRRqIQcgAigCFCIBDQAgAkEQaiEHIAIoAhAiAQ0ACyAJQQA2AgAMAQtBACECCyAIRQ0AAkACQCAEIAQoAhwiB0ECdEGExABqIgEoAgBHDQAgASACNgIAIAINAUEAQQAoAthBQX4gB3dxNgLYQQwCCyAIQRBBFCAIKAIQIARGG2ogAjYCACACRQ0BCyACIAg2AhgCQCAEKAIQIgFFDQAgAiABNgIQIAEgAjYCGAsgBCgCFCIBRQ0AIAIgATYCFCABIAI2AhgLIAYgAGohACAEIAZqIgQoAgQhAQsgBCABQX5xNgIEIAUgAEEBcjYCBCAFIABqIAA2AgACQCAAQf8BSw0AIABBeHFB/MEAaiECAkACQEEAKALUQSIBQQEgAEEDdnQiAHENAEEAIAEgAHI2AtRBIAIhAAwBCyACKAIIIQALIAIgBTYCCCAAIAU2AgwgBSACNgIMIAUgADYCCAwBC0EfIQICQCAAQf///wdLDQAgAEEmIABBCHZnIgJrdkEBcSACQQF0a0E+aiECCyAFIAI2AhwgBUIANwIQIAJBAnRBhMQAaiEBAkACQAJAQQAoAthBIgdBASACdCIEcQ0AQQAgByAEcjYC2EEgASAFNgIAIAUgATYCGAwBCyAAQQBBGSACQQF2ayACQR9GG3QhAiABKAIAIQcDQCAHIgEoAgRBeHEgAEYNAiACQR12IQcgAkEBdCECIAEgB0EEcWpBEGoiBCgCACIHDQALIAQgBTYCACAFIAE2AhgLIAUgBTYCDCAFIAU2AggMAQsgASgCCCICIAU2AgwgASAFNgIIIAVBADYCGCAFIAE2AgwgBSACNgIICyADQQhqC4sMAQd/AkAgAEUNACAAQXhqIgEgAEF8aigCACICQXhxIgBqIQMCQCACQQFxDQAgAkECcUUNASABIAEoAgAiBGsiAUEAKALkQUkNASAEIABqIQACQAJAAkACQCABQQAoAuhBRg0AIAEoAgwhAgJAIARB/wFLDQAgAiABKAIIIgVHDQJBAEEAKALUQUF+IARBA3Z3cTYC1EEMBQsgASgCGCEGAkAgAiABRg0AIAEoAggiBCACNgIMIAIgBDYCCAwECwJAAkAgASgCFCIERQ0AIAFBFGohBQwBCyABKAIQIgRFDQMgAUEQaiEFCwNAIAUhByAEIgJBFGohBSACKAIUIgQNACACQRBqIQUgAigCECIEDQALIAdBADYCAAwDCyADKAIEIgJBA3FBA0cNA0EAIAA2AtxBIAMgAkF+cTYCBCABIABBAXI2AgQgAyAANgIADwsgBSACNgIMIAIgBTYCCAwCC0EAIQILIAZFDQACQAJAIAEgASgCHCIFQQJ0QYTEAGoiBCgCAEcNACAEIAI2AgAgAg0BQQBBACgC2EFBfiAFd3E2AthBDAILIAZBEEEUIAYoAhAgAUYbaiACNgIAIAJFDQELIAIgBjYCGAJAIAEoAhAiBEUNACACIAQ2AhAgBCACNgIYCyABKAIUIgRFDQAgAiAENgIUIAQgAjYCGAsgASADTw0AIAMoAgQiBEEBcUUNAAJAAkACQAJAAkAgBEECcQ0AAkAgA0EAKALsQUcNAEEAIAE2AuxBQQBBACgC4EEgAGoiADYC4EEgASAAQQFyNgIEIAFBACgC6EFHDQZBAEEANgLcQUEAQQA2AuhBDwsCQCADQQAoAuhBRw0AQQAgATYC6EFBAEEAKALcQSAAaiIANgLcQSABIABBAXI2AgQgASAAaiAANgIADwsgBEF4cSAAaiEAIAMoAgwhAgJAIARB/wFLDQACQCACIAMoAggiBUcNAEEAQQAoAtRBQX4gBEEDdndxNgLUQQwFCyAFIAI2AgwgAiAFNgIIDAQLIAMoAhghBgJAIAIgA0YNACADKAIIIgQgAjYCDCACIAQ2AggMAwsCQAJAIAMoAhQiBEUNACADQRRqIQUMAQsgAygCECIERQ0CIANBEGohBQsDQCAFIQcgBCICQRRqIQUgAigCFCIEDQAgAkEQaiEFIAIoAhAiBA0ACyAHQQA2AgAMAgsgAyAEQX5xNgIEIAEgAEEBcjYCBCABIABqIAA2AgAMAwtBACECCyAGRQ0AAkACQCADIAMoAhwiBUECdEGExABqIgQoAgBHDQAgBCACNgIAIAINAUEAQQAoAthBQX4gBXdxNgLYQQwCCyAGQRBBFCAGKAIQIANGG2ogAjYCACACRQ0BCyACIAY2AhgCQCADKAIQIgRFDQAgAiAENgIQIAQgAjYCGAsgAygCFCIERQ0AIAIgBDYCFCAEIAI2AhgLIAEgAEEBcjYCBCABIABqIAA2AgAgAUEAKALoQUcNAEEAIAA2AtxBDwsCQCAAQf8BSw0AIABBeHFB/MEAaiECAkACQEEAKALUQSIEQQEgAEEDdnQiAHENAEEAIAQgAHI2AtRBIAIhAAwBCyACKAIIIQALIAIgATYCCCAAIAE2AgwgASACNgIMIAEgADYCCA8LQR8hAgJAIABB////B0sNACAAQSYgAEEIdmciAmt2QQFxIAJBAXRrQT5qIQILIAEgAjYCHCABQgA3AhAgAkECdEGExABqIQMCQAJAAkACQEEAKALYQSIEQQEgAnQiBXENAEEAIAQgBXI2AthBQQghAEEYIQIgAyEFDAELIABBAEEZIAJBAXZrIAJBH0YbdCECIAMoAgAhBQNAIAUiBCgCBEF4cSAARg0CIAJBHXYhBSACQQF0IQIgBCAFQQRxakEQaiIDKAIAIgUNAAtBCCEAQRghAiAEIQULIAEhBCABIQcMAQsgBCgCCCIFIAE2AgxBCCECIARBCGohA0EAIQdBGCEACyADIAE2AgAgASACaiAFNgIAIAEgBDYCDCABIABqIAc2AgBBAEEAKAL0QUF/aiIBQX8gARs2AvRBCwsRAAJAIAAQWiIADQAQWwsgAAsvAQJ/IABBASAAQQFLGyEBAkADQCABEFYiAg0BEGEiAEUNASAAEQMADAALAAsgAgsFABBfAAsGACAAEFgLBgAgABBcCwUAEA4ACwUAEF4ACwcAIAAoAgALCABBxMUAEGALWQECfyABLQAAIQICQCAALQAAIgNFDQAgAyACQf8BcUcNAANAIAEtAAEhAiAALQABIgNFDQEgAUEBaiEBIABBAWohACADIAJB/wFxRg0ACwsgAyACQf8BcWsLBwAgABCBAQsCAAsCAAsKACAAEGNBCBBdCwoAIAAQY0EIEF0LCgAgABBjQQwQXQsKACAAEGNBEBBdCwoAIAAgAUEAEGsLLQACQCACDQAgACgCBCABKAIERg8LAkAgACABRw0AQQEPCyAAEGwgARBsEGJFCwcAIAAoAgQLrwEBAn8jAEHAAGsiAyQAQQEhBAJAIAAgAUEAEGsNAEEAIQQgAUUNAEEAIQQgAUHkO0GUPEEAEG4iAUUNACADQQhqQQBBOBA5GiADQQE6ADsgA0F/NgIQIAMgADYCDCADIAE2AgQgA0EBNgI0IAEgA0EEaiACKAIAQQEgASgCACgCHBECAAJAIAMoAhwiBEEBRw0AIAIgAygCFDYCAAsgBEEBRiEECyADQcAAaiQAIAQLdQEEfyMAQRBrIgQkACAEQQRqIAAQbyAEKAIIIgUgAkEAEGshBiAEKAIEIQcCQAJAIAZFDQAgACAHIAEgAiAEKAIMIAMQcCEGDAELIAAgByACIAUgAxBxIgYNACAAIAcgASACIAUgAxByIQYLIARBEGokACAGCy8BAn8gACABKAIAIgJBeGooAgAiAzYCCCAAIAEgA2o2AgAgACACQXxqKAIANgIEC8MBAQJ/IwBBwABrIgYkAEEAIQcCQAJAIAVBAEgNACABQQBBACAFayAERhshBwwBCyAFQX5GDQAgBkEcaiIHQgA3AgAgBkEkakIANwIAIAZBLGpCADcCACAGQgA3AhQgBiAFNgIQIAYgAjYCDCAGIAA2AgggBiADNgIEIAZBADYCPCAGQoGAgICAgICAATcCNCADIAZBBGogASABQQFBACADKAIAKAIUEQcAIAFBACAHKAIAQQFGGyEHCyAGQcAAaiQAIAcLsQEBAn8jAEHAAGsiBSQAQQAhBgJAIARBAEgNACAAIARrIgAgAUgNACAFQRxqIgZCADcCACAFQSRqQgA3AgAgBUEsakIANwIAIAVCADcCFCAFIAQ2AhAgBSACNgIMIAUgAzYCBCAFQQA2AjwgBUKBgICAgICAgAE3AjQgBSAANgIIIAMgBUEEaiABIAFBAUEAIAMoAgAoAhQRBwAgAEEAIAYoAgAbIQYLIAVBwABqJAAgBgvWAQEBfyMAQcAAayIGJAAgBiAFNgIQIAYgAjYCDCAGIAA2AgggBiADNgIEQQAhBSAGQRRqQQBBJxA5GiAGQQA2AjwgBkEBOgA7IAQgBkEEaiABQQFBACAEKAIAKAIYEQgAAkACQAJAIAYoAigOAgABAgsgBigCGEEAIAYoAiRBAUYbQQAgBigCIEEBRhtBACAGKAIsQQFGGyEFDAELAkAgBigCHEEBRg0AIAYoAiwNASAGKAIgQQFHDQEgBigCJEEBRw0BCyAGKAIUIQULIAZBwABqJAAgBQt3AQF/AkAgASgCJCIEDQAgASADNgIYIAEgAjYCECABQQE2AiQgASABKAI4NgIUDwsCQAJAIAEoAhQgASgCOEcNACABKAIQIAJHDQAgASgCGEECRw0BIAEgAzYCGA8LIAFBAToANiABQQI2AhggASAEQQFqNgIkCwsdAAJAIAAgASgCCEEAEGtFDQAgASABIAIgAxBzCws2AAJAIAAgASgCCEEAEGtFDQAgASABIAIgAxBzDwsgACgCCCIAIAEgAiADIAAoAgAoAhwRAgALSwECf0EBIQMCQAJAIAAtAAhBGHENAEEAIQMgAUUNASABQeQ7QcQ8QQAQbiIERQ0BIAQtAAhBGHFBAEchAwsgACABIAMQayEDCyADC5EEAQR/IwBBwABrIgMkAAJAAkAgAUHQPkEAEGtFDQAgAkEANgIAQQEhBAwBCwJAIAAgASABEHZFDQBBASEEIAIoAgAiAUUNASACIAEoAgA2AgAMAQsCQCABRQ0AQQAhBCABQeQ7QfQ8QQAQbiIBRQ0BAkAgAigCACIFRQ0AIAIgBSgCADYCAAsgASgCCCIFIAAoAggiBkF/c3FBB3ENASAFQX9zIAZxQeAAcQ0BQQEhBCAAKAIMIAEoAgxBABBrDQECQCAAKAIMQcQ+QQAQa0UNACABKAIMIgFFDQIgAUHkO0GoPUEAEG5FIQQMAgsgACgCDCIFRQ0AQQAhBAJAIAVB5DtB9DxBABBuIgZFDQAgAC0ACEEBcUUNAiAGIAEoAgwQeCEEDAILQQAhBAJAIAVB5DtB5D1BABBuIgZFDQAgAC0ACEEBcUUNAiAGIAEoAgwQeSEEDAILQQAhBCAFQeQ7QZQ8QQAQbiIARQ0BIAEoAgwiAUUNAUEAIQQgAUHkO0GUPEEAEG4iAUUNASACKAIAIQQgA0EIakEAQTgQORogAyAEQQBHOgA7IANBfzYCECADIAA2AgwgAyABNgIEIANBATYCNCABIANBBGogBEEBIAEoAgAoAhwRAgACQCADKAIcIgFBAUcNACACIAMoAhRBACAEGzYCAAsgAUEBRiEEDAELQQAhBAsgA0HAAGokACAEC6QBAQJ/AkADQAJAIAENAEEADwtBACECIAFB5DtB9DxBABBuIgFFDQEgASgCCCAAKAIIQX9zcQ0BAkAgACgCDCABKAIMQQAQa0UNAEEBDwsgAC0ACEEBcUUNASAAKAIMIgNFDQECQCADQeQ7QfQ8QQAQbiIARQ0AIAEoAgwhAQwBCwtBACECIANB5DtB5D1BABBuIgBFDQAgACABKAIMEHkhAgsgAgtYAQF/QQAhAgJAIAFFDQAgAUHkO0HkPUEAEG4iAUUNACABKAIIIAAoAghBf3NxDQBBACECIAAoAgwgASgCDEEAEGtFDQAgACgCECABKAIQQQAQayECCyACC58BACABQQE6ADUCQCABKAIEIANHDQAgAUEBOgA0AkACQCABKAIQIgMNACABQQE2AiQgASAENgIYIAEgAjYCECAEQQFHDQIgASgCMEEBRg0BDAILAkAgAyACRw0AAkAgASgCGCIDQQJHDQAgASAENgIYIAQhAwsgASgCMEEBRw0CIANBAUYNAQwCCyABIAEoAiRBAWo2AiQLIAFBAToANgsLIAACQCABKAIEIAJHDQAgASgCHEEBRg0AIAEgAzYCHAsLgQIAAkAgACABKAIIIAQQa0UNACABIAEgAiADEHsPCwJAAkAgACABKAIAIAQQa0UNAAJAAkAgASgCECACRg0AIAEoAhQgAkcNAQsgA0EBRw0CIAFBATYCIA8LIAEgAzYCIAJAIAEoAixBBEYNACABQQA7ATQgACgCCCIAIAEgAiACQQEgBCAAKAIAKAIUEQcAAkAgAS0ANUEBRw0AIAFBAzYCLCABLQA0RQ0BDAMLIAFBBDYCLAsgASACNgIUIAEgASgCKEEBajYCKCABKAIkQQFHDQEgASgCGEECRw0BIAFBAToANg8LIAAoAggiACABIAIgAyAEIAAoAgAoAhgRCAALC5gBAAJAIAAgASgCCCAEEGtFDQAgASABIAIgAxB7DwsCQCAAIAEoAgAgBBBrRQ0AAkACQCABKAIQIAJGDQAgASgCFCACRw0BCyADQQFHDQEgAUEBNgIgDwsgASACNgIUIAEgAzYCICABIAEoAihBAWo2AigCQCABKAIkQQFHDQAgASgCGEECRw0AIAFBAToANgsgAUEENgIsCws8AAJAIAAgASgCCCAFEGtFDQAgASABIAIgAyAEEHoPCyAAKAIIIgAgASACIAMgBCAFIAAoAgAoAhQRBwALHwACQCAAIAEoAgggBRBrRQ0AIAEgASACIAMgBBB6CwsbAAJAIAANAEEADwsgAEHkO0H0PEEAEG5BAEcLBAAgAAsGACAAJAELBAAjAQsGACAAJAALEgECfyMAIABrQXBxIgEkACABCwQAIwALHAAgACABIAIgA6cgA0IgiKcgBKcgBEIgiKcQDwsLyzkCAEGACAu4OVNldFZlbG9jaXR5AFNldEZyZXF1ZW5jeQBBREV4cEVudgB1bnNpZ25lZCBzaG9ydABTdGFydAB1bnNpZ25lZCBpbnQATUlESUNsb2NrUmVzZXQAZmxvYXQAdWludDY0X3QAUHJvY2VzcwBzdGVwID49IDAgJiYgc3RlcCA8IGtNYXhTdGVwcwB1bnNpZ25lZCBjaGFyAC4vYXVkaW9fdXRpbHMuaHBwAC4vcGFyYW1ldGVyLmhwcABvc2NpbGxhdG9yLmNwcABhdWRpby5jcHAAU3RvcABHZXRTdGVwAFNldER1cmF0aW9uAGJvb2wAS2lja1N5bnRoAFNldFNlcXVlbmNlTGVuZ3RoAHVuc2lnbmVkIGxvbmcAc3RkOjp3c3RyaW5nAHN0ZDo6c3RyaW5nAHN0ZDo6dTE2c3RyaW5nAHN0ZDo6dTMyc3RyaW5nAFNldFRyaWcASW5pdGlhbGl6ZQBzZXRWYWx1ZUludGVycG9sYXRlAE1JRElDbG9ja1B1bHNlAFNldFRvbmUAZG91YmxlAFNldEJlbmQAdm9pZABuZXdfdmFsID49IG1pbl92XyAmJiBuZXdfdmFsIDw9IG1heF92XwBTZXRCUE0AU2V0R2xvYmFsRk0AVXNlTUlESQBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgc2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgaW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxmbG9hdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDY0X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDY0X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVpbnQzMl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQzMl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBjaGFyPgBzdGQ6OmJhc2ljX3N0cmluZzx1bnNpZ25lZCBjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8bG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8ZG91YmxlPgBicG0gPiAwAHNhbXBsZV9yYXRlID4gMAByYXRlID49IDAgJiYgcmF0ZSA8PSAxMDAwMCAmJiAiRk0gUmF0ZSBJbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMEh6IGFuZCAxMEtIeiIAc3RlcHMgPD0ga01heFN0ZXBzICYmIHN0ZXBzID4gMCAmJiAiSW52YWxpZCBudW1iZXIgb2Ygc3RlcHMsIG11c3QgYmUgYmV0d2VlbiAxIGFuZCBtYXggYWxsb3dhYmxlIHN0ZXBzIgBmYWxzZSAmJiAiT3NjaWxsYXRvcjogSW52YWxpZCBTYW1wbGUgUmF0ZSIAbGV2ZWxfZEIgPj0gLTYwICYmIGxldmVsX2RCIDw9IDM2ICYmICJGTSBsZXZlbCBJbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gLTYwZEIgYW5kIDM2ZEIiAGQgPj0gMCAmJiBkIDw9IDQgJiYgIkR1cmF0aW9uIGludmFsaWQsIG11c3QgYmUgYmV0d2VlbiAwIGFuZCA0IgB2ID49IDAgJiYgdiA8PSAxICYmICJWZWxvY2l0eSBpbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMCBhbmQgMSIAdCA+PSAwICYmIHQgPD0gMSAmJiAiVG9uZSBJbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMCBhbmQgMSIAYiA+PSAwICYmIGIgPD0gMSAmJiAiQmVuZCBJbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMCBhbmQgMSIAZiA+PSAyMCAmJiBmIDw9IDUwMDAgJiYgIkZyZXF1ZW5jeSBpbnZhbGlkLCBtdXN0IGJlIGJldHdlZW4gMjAgYW5kIDUwMDAiAGRlY2F5X3RpbWUgPiAwICYmICJBREV4cEVudjogRGVjYXkgVGltZSBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwIgBOU3QzX18yMTJiYXNpY19zdHJpbmdJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRQAAAAAIIAAAWgsAAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0loTlNfMTFjaGFyX3RyYWl0c0loRUVOU185YWxsb2NhdG9ySWhFRUVFAAAIIAAApAsAAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0l3TlNfMTFjaGFyX3RyYWl0c0l3RUVOU185YWxsb2NhdG9ySXdFRUVFAAAIIAAA7AsAAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0lEc05TXzExY2hhcl90cmFpdHNJRHNFRU5TXzlhbGxvY2F0b3JJRHNFRUVFAAAACCAAADQMAABOU3QzX18yMTJiYXNpY19zdHJpbmdJRGlOU18xMWNoYXJfdHJhaXRzSURpRUVOU185YWxsb2NhdG9ySURpRUVFRQAAAAggAACADAAATjEwZW1zY3JpcHRlbjN2YWxFAAAIIAAAzAwAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWNFRQAACCAAAOgMAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lhRUUAAAggAAAQDQAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaEVFAAAIIAAAOA0AAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXNFRQAACCAAAGANAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0l0RUUAAAggAACIDQAATjEwZW1zY3JpcHRlbjExbWVtb3J5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';
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

// include: /Users/davidg/Documents/GitHub/Substrata/c_audio/WASM/post-js.js
// need to call this to create a proper es6 export
export default Module;// end include: /Users/davidg/Documents/GitHub/Substrata/c_audio/WASM/post-js.js

