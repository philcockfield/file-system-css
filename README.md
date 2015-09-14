# fs-css

[![Build Status](https://travis-ci.org/philcockfield/fs-css.svg?branch=master)](https://travis-ci.org/philcockfield/fs-css)

A super-fast caching CSS pre-processor compiler that finds, builds and monitors files across the file-system.

## TODO
- [ ] Cache (fs)
- [ ] File-system monitoring (invalidate cache / chokidar)
- [ ] Handle mixins


## Usage
```js
  import css from "fs-css";

  css.compile("./site", {
    watch: true,      // Default true on "development", false on "production"
  })
  .then((result) => {

  });
```




## Run
    npm install
    npm start


## Test
    # Run tests.
    npm test

    # Watch and re-run tests.
    npm run tdd
