#!/bin/bash
cp -r versions/2.0.0/* .
cp -r versions/Jenkinsfile-v2.0.0 ./Jenkinsfile

git add .
git commit -m "Upgraded to version 2.0.0"
git push origin master
