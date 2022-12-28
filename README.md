# `@soundworks/build`

Build tools for [`soundworks`](https://soundworks.dev) applications, based on `babel` and `webpack`.

*__WARNING: The `@soundworks/build` package targets `soundworks#v4` which is still under heavy development.__*

## Install

Note that the `@soundworks/build` package is automatically installed when creating an application using the `@soundworks/create` wizard, so most of the time you should not have to install this package manually. See [https://soundworks.dev/guides/getting-started.html](https://soundworks.dev/guides/getting-started.html) for more informations on the `soundworks` wizard.

```
npm install --save @soundworks/build
```

## Usage

As for the installation, the commands provided by `@soundworks/build` are consumed by npm scripts in applications created using the `@soundworks/create` wizard, so most of the time you should have to use these commands manually. Refer to the README file of your application to see the available npm commands.

```
Usage: soundworks-build [options]

Options:
  -b, --build                 build application
  -w, --watch                 watch file system to rebuild application (use in conjunction with --build)
  -m, --minify                minify browser js files on build  (use in conjunction with --build)
  -p, --watch-process <name>  restart a node process on each build
  -d, --debug                 enable debug features (inspect, source-maps) when watching a process
  -D, --delete-build          delete .build directory
  -C, --clear-cache           clear webpack cache
  -h, --help                  display help for command
```

## License

[BSD-3-Clause](./LICENSE)
