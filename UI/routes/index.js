var express = require('express');
var router = express.Router();
var app = express();
var url= require('url');
var request = require('request');
var http = require("http");
var http2 = require("http").Server(app);
var io = require('socket.io')(http2);
var fs = require('fs');
var formidable = require('formidable');
let lastversion= null;
let lastsecret= null;

let json= new String(process.env.APPDEF);
json= json.replace(/\'/g, '\"');
let appdef= JSON.parse(json);
let fields= new Array(); 
let types= new Array();

for(var i= 0; i< appdef.fields.length; i++) {
  fields[i] = appdef.fields[i].name;
  types[i] = appdef.fields[i].type;
}


var messages= new Array();
var nmessages= 0;
var messageoffset= -1;
let listener= process.env.LISTENER;
var cassandra = require('cassandra-driver');
let cas_contact= process.env.CASSANDRA_SERVICE;
//let cas_contact= "node-0.cassandra.mesos:9042,node-1.cassandra.mesos:9042,node-2.cassandra.mesos:9042";
var cas_client = new cassandra.Client({contactPoints: [cas_contact]});
var kafka = require('kafka-node');
let kafka_dns= process.env.KAFKA_SERVICE;
//kafka_dns= "master.mesos:2181/dcos-service-kafka";
var kafka_client = new kafka.Client(kafka_dns);
console.log("Kafka client: "+JSON.stringify(kafka_client));
Consumer = kafka.Consumer;
var kafka_consumer = new Consumer(
    kafka_client,
    [
      { topic: appdef.topic, offset: 0}
    ],
    {
      fromOffset: true
    }
  );

kafka_consumer.on('message', function (message) {
  messages[nmessages]= message;
  nmessages++;
  io.emit('chat message', message);
  console.log("Kafka, received message: ", message);
});



io.on('connection', function(socket){
  console.log('a user connected');
});

http2.listen(10500, function(){
  console.log('listening on *:10500');
});

io.emit('some event', { for: 'everyone' });



//"http://dcosappstudio-"+appdef.path+"workerlistener.marathon.l4lb.thisdcos.directory:0/data";

function handleImageDownload(err) {
};
  
  router.post("/bgimage.html", function (request, response) {  
  console.log("upload... :"+process.env.APPDIR);
   var form = new formidable.IncomingForm();
  form.uploadDir = "/"+process.env.APPDIR+"/public/images";
  let fname= '';

  form.on('file', function(name, file){
    fname= file.path;
    console.log("File: "+file.path);
});
   form.parse(request, function(err, fields, files){
     if(err) {
       console.log(err);
     }
     else {
       fs.rename(fname, fname.substring(0, fname.lastIndexOf('/')) + '/bgimg.jpg');
     }
   response.end('upload complete!');
});
});     

router.get('/arch.html', function(req, res, next) {
  res.render('arch', { title: 'DCOS AppStudio' });
});


router.get('/bgimage.html', function(req, res, next) {
  res.render('bgimage', { title: 'DCOS AppStudio' });
});

router.get('/version.html', function(req, res, next) {
  let appsecret= "";
  let version= "";
  try {
    request.get(process.env.UISERVICE+"/version", function(err, response, body) {
      if(err==null) {
        let result= body.split(",");
        version= result[0];
        appsecret= result[1];
        lastversion= version;
        lastsecret= appsecret;
      }
      else {
        console.log(err);
        if(lastversion== null) {
          version= "1.0.0";
        }
        else {
          version= lastversion;
        }
        if(lastsecret== null) {
            appsecret= "";
        }
        else { 
            appsecret= lastsecret;
        }
      }
      console.log("Version "+version);
      console.log("body: "+body);
      res.render('version', { secret: appsecret, version: version});    
    });
  }
  catch(ex) {
    if(lastversion== null) {
      version= "1.0.0";
    }
    else {
      version= lastversion;
    }
    if(lastsecret== null) {
      appsecret= "";
    }
    else { 
      appsecret= lastsecret;
    }

    console.log("CATCH Version "+version);  
    res.render('version', { secret: appsecret, version: version});  
  }});

router.get('/zeppelin.html', function(req, res, next) {
let obj= require("/"+process.env.APPDIR+"/zeppelin-notebook.json");
let txt= JSON.stringify(obj).replace(/TOPIC/g, appdef.topic);
txt= txt.replace(/TABLE/g, appdef.table);
txt= txt.replace(/APPNAME/g, appdef.name);
let l1= "";
let l2= "";
for(let i= 0; i< fields.length; i++) {
  l1+= "(msg \\\\ \\\""+fields[i]+"\\\").as[String]";
  l2+= "\\\""+fields[i]+"\\\"";
  if(i< fields.length-1) {
    l1+= ", ";
    l2+= ", ";
  }
}
console.log(l1);
console.log(l2);

txt= txt.replace(/REPLACE1/g, l1);
txt= txt.replace(/REPLACE2/g, l2);

  res.setHeader('Content-disposition', 'attachment; filename=zeppelin-notebook.json');
  // (msg \\ \"handle\").as[String], (tweet \\ \"content\").as[String], (tweet \\ \"created_at\").as[String]
  // \"handle\", \"content\", \"created_at\"
  //let config= JSON.stringify(groupconfig).replace(/REPLACEME/g, myapp);
  //config= config.replace(/\$PATH/g, "-"+app.get("apppath"));
  res.write(txt);
  res.end();
});


var downloadBGImage = function(callback){
  let bg= appdef.creator+"/"+appdef.path+"/bgimg.jpg";
  console.log("Trying to download: "+bg);
  request.head(bg, function(err, res, body){
    if(err) {
      console.log("INFO: Can't download new image.");
    }
    else {
       console.log('content-type:', res.headers['content-type']);
       console.log('content-length:', res.headers['content-length']);
       request(bg).pipe(fs.createWriteStream(process.env.APPDIR+"/public/images/bgimg.jpg")).on('close', callback);
  }
  });
};

downloadBGImage(handleImageDownload);
console.log('before router');
router.get('/', function(req, res, next) {
  let pn= process.env.PUBLICNODE+":10339";
  let pnlg= process.env.PUBLICNODE+":10081";
  let appsecret= process.env.APPSECRET;
  if(appsecret==undefined) {
    appsecret="Secret undefined. Please set the APPSECRET environment variable.";
  }
console.log('before render');
  res.render('index', { title: appdef.name, name:appdef.name, publicnodekibana: pn, publicnodelg: pnlg, secret: appsecret});
console.log('after render');
});


router.get('/senddata*', function(req, res, next) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  console.log("UI /data: "+query.json);
  console.log("POST: "+listener);
  request.post(listener, {form:query.json}, function(err, response, body) {
  if(err==null) {
    res.statusCode= 200;  
  }
  else {
    res.statusCode= 503;
  }
});
});

router.get('/dashboard.html', function(req, res, next) {
  let pn= process.env.PUBLICNODE+":10339";
  res.render('dashboard', { table: appdef.table, keyspace: appdef.keyspace, publicnode: pn});
});

router.get('/zeppelinframe.html', function(req, res, next) {
  console.log('Zeppelin');
  let cu= process.env.CLUSTER_URL;
  res.render('zeppelinframe', { table: appdef.table, keyspace: appdef.keyspace, clusterurl: cu});
});

router.get('/loaderinframe.html', function(req, res, next) {
  let pnlg= process.env.PUBLICNODE+":10081";
  res.render('loaderinframe', { publicnodelg: pnlg});
});


router.get('/home.html', function(req, res, next) {
  res.render('home', { table: appdef.table, keyspace: appdef.keyspace});
});

router.get('/cassandra.html', function(req, res, next) {
  res.render('cassandra', { table: appdef.table, keyspace: appdef.keyspace});
});

router.get('/kafkadata.html', function(req, res, next) {
  let pn= process.env.PUBLICNODE;
  res.render('kafkadata', { table: appdef.table, keyspace: appdef.keyspace, publicnode: pn});
});

router.get('/map.html', function(req, res, next) {
  res.render('map', { table: appdef.table, keyspace: appdef.keyspace, name:appdef.name});
});


router.get('/cql', function(req, res, next) {
  let url_parts = url.parse(req.url, true);
  let query = url_parts.query;
  let cql= query.cmd;
  console.log("cql: "+cql);
  cas_client.execute(cql, function (err, result) {
           if (!err){
               if ( result.rows.length > 0 ) {
                   for(let r= 0; r< result.rows.length; r++) {
                      console.log(JSON.stringify(result.rows[r]));
                      res.write(JSON.stringify(result.rows[r])+"\n\n");
                   }
               } else {
                   console.log("Cassandra data: No results");
               }
           }
           res.end();
});
});

router.get('/setoffset', function(req, res, next) {
  let url_parts = url.parse(req.url, true);
  let query = url_parts.query;
  messageoffset= query.offset;
  console.log("Offset set to: "+messageoffset);
  res.end();
});

router.get('/mapdata', function(req, res, next) {
  let data= new Object();
  data.total= nmessages;
  data.locations= new Array();
  console.log("Data: "+JSON.stringify(data));

  let i= 0;
  if(messageoffset== -1) {
    if(nmessages> 128)
      i= nmessages-128;
  }
  console.log("nmessages: "+nmessages+" offset: "+messageoffset+" i: "+i);
  let j= 0;
  let maxoffset= 0;
  for(; i< nmessages; i++) {
    if(messageoffset> 0) {
        if(messages[i].offset< messageoffset) {
          console.log("Omitting message: "+messages[i]);
          continue;
        }
    }
    let location= new Object();
    //console.log(messages[i]);

    let latlong= JSON.parse(messages[i].value).location.split(",");
    location.latitude= latlong[0];
    location.longitude= latlong[1];
    location.n= 20;
    data.locations[j++]= location;
    if(messages[i].offset> maxoffset)
      maxoffset= messages[i].offset;
  }
  data.maxoffset= maxoffset;
  res.write(JSON.stringify(data));
  res.end();
});

router.get('/data.html', function(req, res, next) {
  let f;
  f="<p><div>id:</div> "+"<input id='id' style='width: 80%;height: 5%;font-size: 100%;background-color: #F3F3F5';type='text' value='"+new Date().getTime()+"'></input>";
  f+= "<p>";
  if(appdef.showLocation) {
    f+="<div>location:</div> "+"<input id='location' style='width: 80%;height: 5%;font-size: 100%;background-color: #F3F3F5;' type='text' value=''></input>";
    f+= "<p>";
  }
  f+="<div>event_timestamp:</div> "+"<input id='timestamp' style='width: 80%;height: 5%;font-size: 100%;background-color: #F3F3F5;' type='text' value=''></input>";
  f+= "<p>";
  let sf='';
  console.log(JSON.stringify(fields));
  for(let i= 0; i< fields.length; i++) {
    if(fields[i] === "id" || fields[i] === "location" || fields[i] === "event_timestamp")
      continue;
      
   sf+= "json+= ', \""+fields[i]+"\":\"'+document.getElementById('"+fields[i]+"').value+'\"';";
   f+="<div>"+fields[i]+":</div> <input id='"+fields[i]+"' style='width: 80%;height: 5%;font-size: 100%;background-color: #F3F3F5;' type='text' value=''></input>";
   f+= "<p>";
  }
 
  res.render('data', { title: appdef.name, name: appdef.name, fields:f, showLocation: appdef.showLocation, getFields: sf});
});


module.exports = router;

/*
var kafka = require('kafka-node');
var Consumer = kafka.Consumer;

var kafka_client = new kafka.Client("master.mesos:2181/dcos-service-kafka");

var consumer = new Consumer(
    kafka_client,
    [
      { topic: topic, offset: 0}
    ],
    {
      fromOffset: true
    }
  );

consumer.on('message', function (message) {
  console.log("Kafka, received message: ", message);
});
*/
