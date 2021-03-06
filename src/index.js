import R from 'ramda';
import fs from 'fs-extra';
import fsPath from 'path';
import fsWatch from './fs-watch';
import * as util from './util';
import compile from './compile';
import cache from './cache';
import createFileSystemCache from 'file-system-cache';
import CleanCSS from 'clean-css';
import { EXTENSIONS } from './const';

export const CACHE_PATH = './.build/css';

const DEFAULTS = {
  watch: false,         // Flag indicating if file-system watching is enabled.
  minify: false,        // Flag indicating if the css should be minified.
  cache: true,          // Flag indicating if caching should be employed.
  pathsRequired: true,   // Flag indicating if an error should be thrown if the
                        // given paths do not exist.
};

export default {
  defaults: DEFAULTS,

  /**
   * Clears the memory and file cache.
   */
  delete() {
    fs.removeSync(fsPath.resolve(CACHE_PATH));
    cache.clear();
  },

  /**
   * Starts a compiler for the given path(s).
   * @param {string|array} paths: The file-system paths to compile.
   * @param {object} options.
   * @return {Promise}
   */
  compile(paths, options = {}) {
    // Setup initial conditions.
    const cacheKey = cache.key(paths, options);
    options.minify = options.minify || DEFAULTS.minify;
    options.cache = R.isNil(options.cache) ? DEFAULTS.cache : options.cache;
    options.watch = options.watch || DEFAULTS.watch;
    options.pathsRequired = options.pathsRequired === undefined
      ? DEFAULTS.pathsRequired
      : options.pathsRequired;

    // Check the cache.
    if (options.cache === true) {
      const css = cache.value(cacheKey);
      if (css) {
        // The value exists in the cache - return from here.
        return new Promise(resolve => resolve({ css }));
      }
    }

    // Prepare the paths.
    if (!R.is(Array, paths)) { paths = R.reject(R.isNil, [paths]); }
    if (paths.length === 0) { throw new Error(`File-system 'path' was not specified.`); }

    paths = R.pipe(
            R.flatten,
            R.map(path => path && path.startsWith('.') ? fsPath.resolve(path) : path),
            R.reject(R.isNil),
            R.uniq
    )(paths);

    paths.forEach((path, i) => {
      if (!fs.existsSync(path)) {
        if (options.pathsRequired === true) {
          throw new Error(`The CSS path '${ path }' does not exist.`);
        } else {
          paths[i] = null;
        }
      }
    });
    paths = R.reject(R.isNil, paths);

    // Retrieve all CSS source files within the given folders.
    paths.files = R.pipe(
                  R.map(path => util.childPaths(path)),
                  R.flatten,
                  R.filter(path => R.contains(fsPath.extname(path), EXTENSIONS)),
                  R.uniq
    )(paths);

    // Create the unique namespace for the compiler.
    const fileCache = createFileSystemCache({
      basePath: CACHE_PATH,
      ns: paths.map(item => item),
    });

    // Watch the files if in development mode.
    if (options.watch === true) {
      fsWatch(fileCache, paths.files); // Start the file-system watcher.
    }

    // Construct the return promise.
    const promise = new Promise((resolve, reject) => {
      compile(fileCache, paths.files)
      .then(result => {
        if (options.minify === true) { result.css = new CleanCSS().minify(result.css).styles; }
        if (options.cache === true) { cache.value(cacheKey, result.css); }
        resolve(result);
      })
      .catch(err => reject(err));
    });
    promise.options = options;
    promise.paths = paths;

    // Finish up.
    return promise;
  },
};
