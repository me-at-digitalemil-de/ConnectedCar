#!/bin/bash

export APP=ConnectedCar
export APPLOWERCASE=connectedcar

export DCOS_URL=$(dcos config show core.dcos_url)
echo DCOS_URL: $DCOS_URL

dcos package install --yes --cli dcos-enterprise-cli
dcos package install --yes jenkins --package-version=3.2.3-2.60.2
dcos package repo add --index=0 edgelb-aws https://edge-lb-infinity-artifacts.s3.amazonaws.com/autodelete7d/master/edgelb/stub-universe-edgelb.json
dcos package repo add --index=0 edgelb-pool-aws https://edge-lb-infinity-artifacts.s3.amazonaws.com/autodelete7d/master/edgelb-pool/stub-universe-edgelb-pool.json
dcos security org service-accounts keypair edgelb-private-key.pem edgelb-public-key.pem
dcos security org service-accounts create -p edgelb-public-key.pem -d "edgelb service account" edgelb-principal
dcos security org groups add_user superusers edgelb-principal
dcos security secrets create-sa-secret --strict edgelb-private-key.pem edgelb-principal edgelb-secret
rm -f edgelb-private-key.pem
rm -f edgelb-public-key.pem
dcos package install --options=edgelb-options.json edgelb --yes
dcos package install edgelb-pool --cli --yes
echo "Waiting for edge-lb to come up ..."
until dcos edgelb ping; do sleep 1; done
dcos edgelb config edge-lb-pool-direct.yaml

echo Determing public node ip...
export PUBLICNODEIP=$(./findpublic_ips.sh | head -1 | sed "s/.$//" )
echo Public node ip: $PUBLICNODEIP
echo ---------------

if [ ${#PUBLICNODEIP} -le 6 ] ;
then
        echo Can not find public node ip. JQ in path?
        exit -1
fi

PRIVATENODEIP=$(./findprivate_ips.sh | tail -1)
echo Private node ip: $PRIVATENODEIP
if [ ${#PUBLICNODEIP} -le 6 ] ;
then
        echo Can not find a priavte node ip. JQ in path?
        exit -1
fi
echo ---------------

cp gitlab.json.template gitlab.json
sed -ie "s@\$PINNEDNODE@$PRIVATENODEIP@g;" gitlab.json

sed  '/gitlab/d' /etc/hosts >./hosts
echo "$PUBLICNODEIP gitlab.$APPLOWERCASE.mesosphere.io" >>./hosts
echo We are going to add "$PUBLICNODEIP gitlab.$APPLOWERCASE.mesosphere.io" to your /etc/hosts. Therefore we need your local password.
sudo mv hosts /etc/hosts

echo Installing gitlab...
dcos marathon app add gitlab.json

dcos package install --options=kibana-config.json --yes kibana --package-version=2.0.0-5.5.1
dcos package install --yes elastic --package-version=2.0.0-5.5.1 --options=elastic-config.json
dcos package install --yes cassandra --package-version=1.0.25-3.0.10
dcos package install --yes kafka --package-version=1.1.19.1-0.10.1.0


until $(curl --output /dev/null --silent --head --fail http://gitlab.$APPLOWERCASE.mesosphere.io:10080); do
    printf '.'
    sleep 5
done


	
echo "Waiting for edge-lb to come up ..."
until dcos edgelb ping; do sleep 1; done

echo
echo I am going to open a browser window to gitlab. Please set the root user password there to \"rootroot\" and confirm it with \"rootroot\"
echo Afterwards please logon to gitlab \(in the browser\) as user \"root\" with password \"rootroot\"
echo When done please come back.
open http://gitlab.$APPLOWERCASE.mesosphere.io:10080
read -p "Press key when you set the password and are logged in as root." -n1 -s 
echo
echo On the bottom of the gitlab webpage is a green button \"New Project\". Please press it.
read -p "Press key when you are on the \"New project\" page." -n1 -s 
echo
echo Press the \"GitHub\" button.
read -p "Press a key when you are on the \"Import Projects from GitHub\" page." -n1 -s
echo
echo Here comes your \"Personal Access Token\":
echo Please copy the github token provided elsewhere and paste it into the browser form. Then press the green \"List Your GitHub Repositories\" button.
read -p "Press button when done." -n1 -s
echo
echo You can see all the existing projects now. Please look for \"$APP\" and press the \"Import\" button on the right.
read -p "Press button when done." -n1 -s
echo
echo After a while the row with \"$APP\" turns green. Please click the link \"root/$APP\" in the "To GitLab" column.
echo Congratulations! We are done setting up gitlab.
echo We will now clone the repo to a location you specify \(./tmp is a good candidate\).
echo -n "Where shall I clone to? (When prompted for password: \"rootroot\") > "
read dir
echo Now I am going to clone the repo and install the app. This will take a couple of minutes, please come back after the browser opened a window with the running app.
mkdir -p $dir
cd $dir
git clone http://root@gitlab.$APPLOWERCASE.mesosphere.io:10080/root/$APP.git
cd $APP
./install-$APPLOWERCASE.sh 
echo
echo We are setting up Jenkins now. 
read -p "Press button when ready." -n1 -s
echo
open $DCOS_URL/service/jenkins/configure
echo Please add a global environment variable \(under Global properties\) called: DOCKERHUB_REPO and set it to your dockerhub account \(e.g. my is digitalemil\) plus: /$APPLOWERCASE
echo Then press: Save
read -p "Press button when ready." -n1 -s
echo
echo Now let us connect Jenkins to gitlab which runs in DC/DCOS_URL
echo First we need to create credentials for gitlab. Please use root as username and rootroot as password, id should read gitlab
open $DCOS_URL/service/jenkins/credentials/store/system/domain/_/newCredentials
read -p "Press button when ready." -n1 -s
echo
echo We also need to provide Jenkins with your dockerhub username and password. 
echo id: dockerhub 
open $DCOS_URL/service/jenkins/credentials/store/system/domain/_/newCredentials
read -p "Press button when ready." -n1 -s
echo
echo Next step is to create the build pipleine. In the browser window please call the item $APP and select Pipeline as type and then press OK
open $DCOS_URL/service/jenkins/view/all/newJob
read -p "Press button when ready." -n1 -s
echo
echo Now check Poll SCM and use "* * * * *" as schedule. Press Apply. Scroll down to Pipeline and select \"Pipeline script from SCM\". Select Git as SCM
read -p "Press button when ready." -n1 -s
echo
echo Next we need to define the repository. Please enter http://gitlab.marathon.l4lb.thisdcos.directory/root/$APP.git as Repository URL and select root/******** as credentials. Press Apply
echo We are all set now. Thank you for your patience. You can now start build-pipelines by executing the upgrade.sh or downgrade.sh script in the folder where we cloned the repo into.
echo Good luck!

