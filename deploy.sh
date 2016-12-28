#!/bin/bash

rsync -a --exclude=app/config --exclude=app/storage ./ root@vanvikil.no:/home/vanvikil/www/turnering.vanvikil.no
