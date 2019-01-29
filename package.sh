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

# Change name for packaging
sed -i 's/Plex bulk downloader dev/Plex bulk downloader/' package/manifest.json

zip -r -9 package.zip package

# Revert name so testing stays testing
sed -i 's/Plex bulk downloader/Plex bulk downloader dev/' package/manifest.json