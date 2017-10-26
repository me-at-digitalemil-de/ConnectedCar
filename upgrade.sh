#!/bin/bash
cp -r versions/2.0.0/* .
cp versions/Jenkinsfile-v2.0.0 ./Jenkinsfile
cp versions/uiservice.json ./uiservice.json


git add .
git commit -m "Upgraded to version 2.0.0"
git push origin master
