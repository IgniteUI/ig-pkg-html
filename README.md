ig-pkg-html
===========

Base HTML package for Ignite UI Web Designer.

# To get set up using this with the Web Designer project..

1. Go to web-designer, master branch. Pull latest.
2. It should have this repo as a git submodule; run `git submodule init` and `git submodule update` ([see here for more info](http://joncairns.com/2011/10/how-to-use-git-submodules/#cloning)).
3. Go to `cd <web-designer root>/modules/html` (where the repo should be added as a submodule).
4. Run `npm install`; this should get all package dependencies.
5. Go to `cd ../..` to get back to parent repo of web-designer and run `grunt build`.  This should build this package and then grab its dist output and put it into the lib/packages dir, so it will be available along with the other packages currently under src/packages (both are mounted when running grunt server).
6. Run `grunt server` from the web-designer repo dir, and it should run, loading both packages in src/packages as well as any in lib/packages.  

You should see the html package in the IDE. You can work on both the web-designer and ig-pkg-html repos independently. Git treats submodules as their own repos. 

ig-pkg-html is just on master for now. 