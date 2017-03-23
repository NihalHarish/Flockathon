var google = require('googleapis');
var fs = require('fs');
var express = require('express')
var app = express();
var bodyParser = require('body-parser')
var request = require('request');

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: false
}));


var OAuth2 = google.auth.OAuth2;

// Load client secrets from a local file.
googledata = JSON.parse(fs.readFileSync('keys/client_secret.json').toString());

if(process.env.environ=='aws'){
redirect_code = 0;
}
else{
redirect_code = 1;
}

var oauth2Client = new OAuth2(
  googledata.web.client_id,
  googledata.web.client_secret,
  googledata.web.redirect_uris[redirect_code]
);

// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

function saveSettings (settings) {
  console.log("Saving settings for "+settings.userId);
  console.log(settings);
    var file = settings.userId+'.json';
    fs.writeFileSync(file,JSON.stringify(settings));
}

function getSettings(userId){
  var file = userId+'.json';
  var settings = JSON.parse(fs.readFileSync(file).toString());
  return settings;
}

app.post('/flock', function(req,res){
  console.log("in /flock")
  // console.log(req.query);
  if(req.body.name == "app.install"){
    console.log("in install")
    console.log(req.body.userId);
    saveSettings({userId:req.body.userId, token: req.body.token});
    res.sendStatus(200);
  }
  else if(req.body.name == "app.uninstall"){
    console.log("user uninstalling ");
    res.sendStatus(200);
  }
  else{
  console.log("in the /screwdrive command")
  console.log(req.body);
  console.log(req.body.userId)
  var initiator_user_id = req.body.userId;
  var receiver_user_id = req.body.chat;
  var initiator_settings = getSettings(initiator_user_id);
  var receiver_settings = getSettings(receiver_user_id)
  console.log(initiator_settings);

  request("https://api.flock.co/v1/chat.sendMessage?to="+receiver_settings.userId+"&text="+"geloo"+"&token="+initiator_settings.token, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
  });

  res.sendStatus(200);
}
});

// app.get('/install', function(req,res){
//   console.log("in install")
//   data = JSON.parse(req.body);
//   console.log(data);
//   saveSettings({userId:data.userId, token: data.token});
//   res.sendStatus(200);
// });

// app.all("*", function(req,res){
// console.log(req.query);
// console.log(req.body);
// });

app.get('/googleredirect', function(req,res){
  var code = req.query.code;
  var searchstring = req.query.searchstring;
  oauth2Client.getToken(code, function (err, tokens) {
  // Now tokens contains an access_token and an optional refresh_token. Save them.
  if (!err) {
    console.log(tokens)
    oauth2Client.setCredentials(tokens);
    res.send({success:true});
  }
  else{
    res.send({success:false})
  }
});

});

app.get('/drivesearch', function (req, res) {
  var searchstring = req.query.searchstring;
  var url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'online',

    // If you only need one scope you can pass it as a string
    scope: scopes,

    // Optional property that passes state parameters to redirect URI
    state: { searchstring: searchstring }
  });

  res.redirect(url);
});


app.listen(8080);
