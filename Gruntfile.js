'use strict';
var LIVERELOAD_PORT = 35729;
var lrSnippet = require('connect-livereload')({port: LIVERELOAD_PORT});
var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
};

module.exports = function (grunt) {
    // load all npmnpgrunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
    require('time-grunt')(grunt);

    // configurable paths
    var packageConfig = {
        src: 'src',
        libs: 'lib',
        dist: 'dist',
        name: 'html'
    };

    grunt.initConfig({
        pkg: packageConfig,
        watch: {
            options: {
                nospawn: true,
                livereload: true
            },
        
            livereload: {
                options: {
                    livereload: LIVERELOAD_PORT
                },
                files: [
                    '{.tmp,<%= pkg.src %>}/js/{,*/}*.js',
                    '<%= pkg.src %>/img/{,*/}*.{png,jpg,jpeg,gif,webp}'
                ]
            }
        },
        connect: {
            options: {
                port: 9000,
                // change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, packageConfig.libs),
                            mountFolder(connect, packageConfig.src)
                        ];
                    }
                }
            },
            dist: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, packageConfig.dist)
                        ];
                    }
                }
            }
        },
        open: {
            server: {
                path: 'http://localhost:<%= connect.options.port %>'
            }
        },
        clean: {
            dist: ['.tmp', '<%= pkg.dist %>/*'],
            server: '.tmp'
        },
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= pkg.src %>',
                    dest: '<%= pkg.dist %>/<%= pkg.name %>',
                    src: [
                        'toolbox.json',
                        'config/**',
                        'icons/**',
                        'plugins/**'
                    ]
                },
                ]
            }
        }
    });


    grunt.registerTask('server', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'open', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'connect:livereload',
            'copy',
            'open',
            'watch'
        ]);
    });

    grunt.registerTask('build', [
        'clean:dist',
        'copy:dist'
    ]);

    grunt.registerTask('default', [
        'build'
    ]);
};
