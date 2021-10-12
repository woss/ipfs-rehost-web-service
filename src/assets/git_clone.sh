#!/usr/bin/env bash

set -eux

REPO_PATH=$1
REPO_URL=$2

if [ -z $1 ]; then
  echo "The first argument is not set"
else
  echo "The first argument: $1"
fi

if [ ! -z $2 ]; then
  echo "The second argument: $2"
else
  echo "The second argument is not set"
fi

if [ -d "$REPO_PATH" ]; then
  echo "Removing existing git repo ..."
  rm -rf $REPO_PATH
fi

echo "Cloning the bare repo ..."
git clone --bare $REPO_URL $REPO_PATH

cd $REPO_PATH

echo "Updating repository server info"
git update-server-info

echo "Unpacking ..."
mv objects/pack/*.pack .
cat *.pack | git unpack-objects
rm -f *.pack
rm -f objects/pack/*.idx
