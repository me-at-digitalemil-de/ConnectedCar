#!/bin/bash
cp -r versions/1.0.0/* .
cp -r versions/Jenkinsfile-v1.0.0 ./Jenkinsfile

git add .
git commit -m "Downgraded to version 1.0.0"
git push origin master
