export CASSANDRA_SERVICE=10.0.1.3:9042
export KAFKA_SERVICE="10.0.1.3:2181"
export LISTENER="http://localhost:3030/data"
export APPDEF="{'name':'My cool App','showLocation':true,'fields':[{'name':'f1','pivot':false,'type':'String'},{'name':'f2','pivot':false,'type':'Integer'},{'name':'f3','pivot':true,'type':'Double'},{'name':'f4','pivot':false,'type':'Boolean'},{'name':'id','type':'Long','pivot':'false'},{'name':'location','type':'Location','pivot':'false'},{'name':'event_timestamp','type':'Date/time','pivot':'false'}],'transformer':'%09%0A%09%2F%2F%20Raw%20message%20available%20as%3A%20rawtext%3B%0A%09%2F%2F%20save%20result%20in%20variable%3A%20result%0A%09%2F%2F%20result%20is%20of%20type%20String%0A%09%0A%09%2F%2F%20get%20json%20object%3A%20JSON.parse(rawtext)%3B%0A%09%2F%2F%20also%20available%20fields%5B%5D%20and%20types%5B%5D%3A%0A%09%2F%2F%20e.g.%20fields%5B0%5D%3D%3D%20%22id%22%2C%20%20types%5B0%5D%3D%3D%22Long%22%0A%0A%09console.log(%22In%20%3A%20%22%2Brawtext)%3B%0A%09let%20json%3D%20JSON.parse(rawtext)%3B%0A%09%2F%2Fjson.f1%3D%20%22WORLD%22%3B%0A%09result%3D%20JSON.stringify(json)%3B%0A%09console.log(%22After%20transformation%3A%20%22%2Bresult)%3B%0A%09%09%09%09%09','topic':'bar2','table':'foo2','keyspace':'keys2','path':'appzweidrei','creator':'http://esiemes-8-publicsl-6wi1vh15zvpe-1608036474.eu-central-1.elb.amazonaws.com'}"
export APPDIR=.
nodemon npm start


