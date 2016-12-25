#!/bin/bash

rsync -a --exclude=app/config --exclude=app/storage ./ vanvikil@vanvikil.no:/home/vanvikil/www/turnering.vanvikil.no
