#!/bin/bash
yarn build
mv dist chatroomdist
zip -r chatroom.zip chatroomdist/
rm  -r ./chatroomdist
ssh -t root@178.62.43.240 'rm -r /home/digitalwestie/chatroomdist'
scp chatroom.zip root@178.62.43.240:/home/digitalwestie/
