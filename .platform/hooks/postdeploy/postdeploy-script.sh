#!/bin/bash
# install JQ
sudo yum install jq -y 
/opt/elasticbeanstalk/bin/get-config environment | jq -r 'to_entries | .[] | "export \(.key)=\"\(.value)\""' > /etc/profile.d/sh.local
cd /var/app/current/ && yarn install 

