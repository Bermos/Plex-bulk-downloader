#!/usr/bin/env bash

rm package.zip
rm -r package
mkdir package
rsync -av . package \
--exclude .gitignore \
--exclude LICENSE \
--exclude *.iml \
--exclude .idea \
--exclude .git \
--exclude README.md \
--exclude icon.png \
--exclude package \
--exclude package.sh \
--exclude package.zip

zip -r -9 package.zip package