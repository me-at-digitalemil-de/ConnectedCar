#!/bin/bash

export CLUSTER_URL=$(dcos config show core.dcos_url)
read -p "Install services? (y/n) " -n1 -s c
if [ "$c" = "y" ]; then
	echo yes
	dcos package install --yes --cli dcos-enterprise-cli
	dcos package install --yes cassandra --package-version=1.0.25-3.0.10
	dcos package install --yes kafka --package-version=1.1.19.1-0.10.1.0
	dcos package install --yes beta-elastic --package-version=1.0.13-5.4.1-beta --options=elastic_config.json
	dcos package install --options=kibana_config.json --yes beta-kibana --package-version=1.0.13-5.4.1-beta

	dcos package repo add --index=0 edgelb-aws https://edge-lb-infinity-artifacts.s3.amazonaws.com/autodelete7d/master/edgelb/stub-universe-edgelb.json
	dcos package repo add --index=0 edgelb-pool-aws https://edge-lb-infinity-artifacts.s3.amazonaws.com/autodelete7d/master/edgelb-pool/stub-universe-edgelb-pool.json
	dcos package install dcos-enterprise-cli --yes --cli
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
else
	echo no
fi
echo
if  [[ $1 == http* ]] 
then
	export PUBLICELBHOST=$(echo $1 | awk -F/ '{print $3}')
else
echo $1 | awk -F/ '{print $3}'
	export PUBLICELBHOST=$(echo $1 | awk -F/ '{print $1}')
fi
echo Determing public node ip...
export PUBLICNODEIP=$(./findpublic_ips.sh | head -1 | sed "s/.$//" )
echo Public node ip: $PUBLICNODEIP 
echo ------------------

if [ ${#PUBLICNODEIP} -le 6 ] ;
then
	echo Can not find public node ip. JQ in path?  Also, you need to have added the pem for your nodes to your auth agent with the ssh-add command.
	exit -1
fi
cp connected-car-config.jsontemplate config.tmp
sed -ie "s@PUBLIC_IP_TOKEN@$PUBLICNODEIP@g;"  config.tmp
sed -ie "s@CLUSTER_URL_TOKEN@$CLUSTER_URL@g;"  config.tmp

seconds=0
OUTPUT=0
sleep 5
while [ "$OUTPUT" -ne 1 ]; do
  OUTPUT=`dcos marathon app list | grep kibana | awk '{print $5}' | cut -c1`;
  if [ -z "$OUTPUT" ];then
	OUTPUT=0
  fi
  seconds=$((seconds+5))
  printf "Waiting %s seconds for Kibana to come up.  It normally takes about 400 seconds.\n" "$seconds"
  sleep 5
done

dcos marathon group add config.tmp

until $(curl --output /dev/null --silent --head --fail http://$PUBLICNODEIP); do
    printf '.'
    sleep 5
done
./permissions.sh connected-car-config.jsontemplate
open http://$PUBLICNODEIP
rm config.tmp
rm config.tmpe
