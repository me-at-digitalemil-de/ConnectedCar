var express = require('express');
var router = express.Router();
var url= require('url');
var request = require('request');
var http = require("http");

var vis= require('../visualizations.json');
console.log(vis[0]);

let json= new String(process.env.APPDEF);
json= json.replace(/\'/g, '\"');

let appdef= JSON.parse(json);

let fields= new Array(); 
let types= new Array();
let pivot= -1;

for(var i= 0; i< appdef.fields.length; i++) {
  fields[i] = appdef.fields[i].name;
  types[i] = appdef.fields[i].type;
}

let elastic= process.env.ELASTIC_SERVICE;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: "Elastic Worker", appdef: JSON.stringify(appdef)
    });
});

let index= { "mappings": { "event_timestamp": { "properties": { "event_timestamp": { "type": "date" }}}, "location": { "properties": { "location": { "type": "geo_point" }}}, "heartrate": { "properties": { "heartrate": { "type": "integer" }}}, "user": { "properties": { "user": { "type": "string" }}}, "deviceid": { "properties": { "deviceid": { "type": "string" }}}, "color": { "properties": { "color": { "type": "string" }}}}}

let ni= 0;
// Create index  
try {
    let props= '{ "mappings": { "event_timestamp": { "properties": { "event_timestamp": { "type": "date" }}}, "location": { "properties": { "location": { "type": "geo_point" }}}';
    for(var i= 0; i< fields.length; i++) {
      if(fields[i]=== "id" || fields[i]=== "event_timestamp" || fields[i]=== "location")
        continue;
        if(appdef.fields[i].pivot==="true")
          pivot= i;
        /*
      if(i< fields.length-1) {
        props+= ", "
      }*/
      let type= "integer";
      if(types[i]=== "Long")
        type= "long";
      if(types[i]=== "Double")
        type= "double";
      if(types[i]=== "Boolean")
        type= "boolean";
      if(types[i]=== "String")
        type= "string";
      if(types[i]=== "Date/time" || types[i]=== "Date/Time")
        type= "date";
      if(types[i]=== "Location")
        type= "geo_point";

      props+= ', "'+fields[i]+'": { "properties": { "'+fields[i]+'": { "type": "'+type+'" }}}';
    }
    props+="}}";
    console.log("Elastic Index: "+props);
    console.log("Elastic: "+elastic+"/"+appdef.path+"?pretty");
    
    createIndex(props);
}
catch(ex) {
  console.log(ex);
}

function createIndex(props) {
  request.put(elastic+"/"+appdef.path+"?pretty", {form: props}, function(err, response, body) {
      if(err== null) {
        console.log(body);
      }
      else {
        console.log(ni+" "+err);
      }
      if(response.statusCode == 404) {
        if(ni< 32) {
            ni++;
            setTimeout(createIndex(props), 100);
         }
      }
    });
};


function putToElastic(index, json, type, id) {
  try {
    console.log("Put to elastic: "+elastic+"/"+index+"/"+type+"/"+id+"?pretty");
    let options= { 
                url: elastic+"/"+index+"/"+type+"/"+id+"?pretty",
                headers: {
                  'Content-Type': 'application/json'
                },
                body:JSON.stringify(json)
    };
    console.log("url: "+options.url);
    request.put(
      options, function(err, response, body) {
      if(err== null) {
        console.log(body);
      }
      else {
        console.log(err);
      }
    });
  }
  catch(ex) {
    console.log(ex);    
  }
};
// Create Visualizations and Dashbord
//{"_index":".kibana","_type":"visualization","_id":"4efede00-33c1-11e7-b8e7-e7f06fdb10c1","_score":1.0,"_source":
if(pivot> -1) {
  setTimeout(createIndexPattern, 1000);
};

function createIndexPattern() {
  let ip= '{"title":"__INDEX","timeFieldName":"event_timestamp","fields":"[{\\"name\\":\\"_id\\",\\"type\\":\\"string\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":false,\\"analyzed\\":false,\\"doc_values\\":false,\\"searchable\\":false,\\"aggregatable\\":false},{\\"name\\":\\"_type\\",\\"type\\":\\"string\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":false,\\"analyzed\\":false,\\"doc_values\\":false,\\"searchable\\":true,\\"aggregatable\\":true},{\\"name\\":\\"_index\\",\\"type\\":\\"string\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":false,\\"analyzed\\":false,\\"doc_values\\":false,\\"searchable\\":false,\\"aggregatable\\":false},{\\"name\\":\\"_score\\",\\"type\\":\\"number\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":false,\\"analyzed\\":false,\\"doc_values\\":false,\\"searchable\\":false,\\"aggregatable\\":false},{\\"name\\":\\"_source\\",\\"type\\":\\"_source\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":false,\\"analyzed\\":false,\\"doc_values\\":false,\\"searchable\\":false,\\"aggregatable\\":false},';
  console.log("Index pattern: "+ip);

for(i= 0; i< fields.length; i++) {
  let type= "number";
  if(fields[i]=== "id")
    continue;
      if(types[i]=== "Long")
        type= "number";
      if(types[i]=== "Double")
        type= "number";
      if(types[i]=== "Boolean")
        type= "boolean";
      if(types[i]=== "String")
        type= "string";
      if(types[i]=== "Date/time" || types[i]=== "Date/Time")
        type= "date";
      if(types[i]=== "Location")
        type= "geo_point";
  if(type=== "string") {
    ip+= '{\\"name\\":\\"'+fields[i]+'\\",\\"type\\":\\"'+type+'\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":true,\\"analyzed\\":true,\\"doc_values\\":true,\\"searchable\\":true,\\"aggregatable\\":false},';
    ip+= '{\\"name\\":\\"'+fields[i]+'.keyword\\",\\"type\\":\\"'+type+'\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":true,\\"analyzed\\":false,\\"doc_values\\":true,\\"searchable\\":true,\\"aggregatable\\":true}'; 
 }
  else {
    ip+= '{\\"name\\":\\"'+fields[i]+'\\",\\"type\\":\\"'+type+'\\",\\"count\\":0,\\"scripted\\":false,\\"indexed\\":true,\\"analyzed\\":false,\\"doc_values\\":true,\\"searchable\\":true,\\"aggregatable\\":true}';
  }
  if(i< fields.length-1)
  ip+= ",";
}
ip+= ']"}';
ip= ip.replace(/__INDEX/g, appdef.path);
 try {
   request.put(elastic+"/"+".kibana"+"/"+"index-pattern"+"/"+appdef.path+"?pretty", {form:ip}, function(err, response, body) {
      if(err!= null) {
        console.log(err);
      }
      else {
        console.log(body);
       setTimeout(createDashboard, 1000);
     }
    });
  }
  catch(ex) {
    console.log(ex);    
  }
}

function createDashboard() {
let v1= JSON.stringify(vis[0]);
v1= v1.replace(/PIVOTFIELD/g, fields[pivot]);
v1= v1.replace(/__INDEX/g, appdef.path);
console.log("v1: "+v1);

let v2= JSON.stringify(vis[1]);
v2= v2.replace(/PIVOTFIELD/g, fields[pivot]);
v2= v2.replace(/__INDEX/g, appdef.path);
console.log("v2: "+v2);

let v3= JSON.stringify(vis[2]);
v3= v3.replace(/PIVOTFIELD/g, fields[pivot]);
v3= v3.replace(/__INDEX/g, appdef.path);
console.log("v3: "+v3);

let v4= JSON.stringify(vis[3]);
v4= v4.replace(/PIVOTFIELD/g, fields[pivot]);
v4= v4.replace(/__INDEX/g, appdef.path);
console.log("v4: "+v4);

let d1='{"title":"AppDashboard","hits":0,"description":"","panelsJSON":"[{\\"col\\":1,\\"id\\":\\"4efede00-33c1-11e7-b8e7-e7f06fdb10c1\\",\\"panelIndex\\":1,\\"row\\":1,\\"size_x\\":6,\\"size_y\\":2,\\"type\\":\\"visualization\\"},{\\"col\\":1,\\"id\\":\\"5bb705d0-33c3-11e7-b8e7-e7f06fdb10c1\\",\\"panelIndex\\":2,\\"row\\":3,\\"size_x\\":6,\\"size_y\\":4,\\"type\\":\\"visualization\\"},{\\"col\\":7,\\"id\\":\\"9f6fe800-33c3-11e7-b8e7-e7f06fdb10c1\\",\\"panelIndex\\":3,\\"row\\":1,\\"size_x\\":6,\\"size_y\\":3,\\"type\\":\\"visualization\\"},{\\"size_x\\":6,\\"size_y\\":3,\\"panelIndex\\":4,\\"type\\":\\"visualization\\",\\"id\\":\\"91a362a0-33c4-11e7-b8e7-e7f06fdb10c1\\",\\"col\\":7,\\"row\\":4}]","optionsJSON":"{\\"darkTheme\\":false}","uiStateJSON":"{\\"P-2\\":{\\"mapCenter\\":[68.78414378041504,-97.3828125]},\\"P-3\\":{\\"vis\\":{\\"params\\":{\\"sort\\":{\\"columnIndex\\":null,\\"direction\\":null}}}}}","version":1,"timeRestore":false,"kibanaSavedObjectMeta":{"searchSourceJSON":"{\\"filter\\":[{\\"query\\":{\\"query_string\\":{\\"analyze_wildcard\\":true,\\"query\\":\\"*\\"}}}]}"}}';
d1= d1.replace(/AppDashboard/g, appdef.name);
console.log("d1: "+d1);

putToElastic(".kibana",JSON.parse(v1), "visualization", "4efede00-33c1-11e7-b8e7-e7f06fdb10c1");
putToElastic(".kibana",JSON.parse(v2), "visualization", "5bb705d0-33c3-11e7-b8e7-e7f06fdb10c1");
putToElastic(".kibana",JSON.parse(v3), "visualization", "9f6fe800-33c3-11e7-b8e7-e7f06fdb10c1");
putToElastic(".kibana",JSON.parse(v4), "visualization", "91a362a0-33c4-11e7-b8e7-e7f06fdb10c1");
putToElastic(".kibana",JSON.parse(d1), "dashboard", "06d4a280-33c2-11e7-b8e7-e7f06fdb10c1");
setTimeout(flushIndex, 500);
};

function flushIndex() {
   try {
   request.post(elastic+"/"+".kibana"+"/_flush?wait_if_ongoing", function(err, response, body) {
      if(err!= null) {
        console.log(err);
      }
      else {
        console.log(body);
     }
    });
  }
  catch(ex) {
    console.log(ex);    
  }
};

router.post('/data', function(req, res, next) {
  console.log(req.body);
  let json= JSON.parse(req.body);
  let t= json.event_timestamp;
  let ms= new Date(t.toString().trim()).getTime();
  json.event_timestamp= ms;
  console.log("ms: "+ms);
  console.log("json: "+JSON.stringify(json));
  let id= json.id;
  delete json.id;
  putToElastic(appdef.path, json, "external", id);
  res.statusCode= 200;
  res.end();
});

module.exports = router;
