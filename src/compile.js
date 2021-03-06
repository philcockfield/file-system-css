import R from 'ramda';
import stylusCompiler from './compile-stylus';
import loadCss from './load-css';



const merge = (sourceFiles, targetFiles) =>
  targetFiles.map(item => {
    const index = R.findIndex(m => m.path === item.path, sourceFiles);
    if (index > -1) {
      item.css = sourceFiles[index].css;
    }
    return item;
  });


const concatenate = (files) => {
  const css = R.pipe(R.map(R.prop('css')), R.reject(R.isNil));
  const append = (result, file) => result += `\n\n\n${ file }`;
  return R.reduce(append, '', css(files));
};


const saveToDisk = (fileCache, files) => {
  const toPayload = R.map(item => ({
    key: item.path,
    value: { path: item.path, css: item.css },
  }));
  return fileCache.save(toPayload(files));
};




export default (fileCache, paths) => {
  let files;
  let compiledFiles;

  return new Promise((resolve, reject) => {
    // Read in any existing items from cache.
    //  - store the cached CSS on the return object.
    //  - remove that existing item from the list to compile.
    fileCache
      .load()
      .then(cached => {

        const cachedFiles = R.filter(item => item.value)(cached.files);
        const cachedPaths = R.map(item => item.value.path)(cachedFiles);
        const isCached = (path) => R.contains(path)(cachedPaths);
        const cachedFile = (path) => R.find(item => item.value.path === path)(cachedFiles);
        const uncachedPaths = R.reject(isCached, paths);

        // Create the return array.
        //  - populate with any CSS that already exists in the cache.
        files = paths.map(path => {
          const fromCache = cachedFile(path);
          const css = fromCache ? fromCache.value.css : undefined;
          return { path, css };
        });


        // Compile stylus.
        stylusCompiler.compile(uncachedPaths)
          .then(result => compiledFiles = result)
          .catch(err => reject(err))

          // Merge the compiled files into the result set.
          .then(() => files = merge(compiledFiles, files))

          // Cache CSS to disk.
          .then(() => saveToDisk(fileCache, compiledFiles))

          // Add raw CSS files (.css)
          .then(() => {
            loadCss(paths)
              .then(result => files = merge(result, files))
              .then(() => { // Concatenate into final result.
                try {
                  resolve({ files, css: concatenate(files) });
                } catch (e) { reject(e); }
              });
          }).catch(err => reject(err));
      });
  });
};
