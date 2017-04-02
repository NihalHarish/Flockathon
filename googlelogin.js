var google = require('googleapis');
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');

// Configure app to be a side bar app
// Build UI for sidebar register endpoint for it i.e typeahead
// Make a map between the Google API and the natural language input used for it.
// Show mocks during presentation for History, calendar etc to help better understand the idea.

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

function saveSettings(settings) {
  console.log("Saving settings for "+settings.userId);
  console.log(settings);
    var file = settings.userId+'.json';
    fs.writeFileSync(file,JSON.stringify(settings));
}

function saveGoogleSettings(settings) {
  console.log("Saving google settings for "+settings);
  var file = 'googleauth.json';
  fs.writeFileSync(file,JSON.stringify(settings));
}

function getGoogleSettings(){
  var settings = JSON.parse(fs.readFileSync('googleauth.json').toString());
  return settings;
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
    console.log("in install");
    console.log(req.body.userId);
    saveSettings({userId:req.body.userId, token: req.body.token});
    res.sendStatus(200);
  }
  else if(req.body.name == "app.uninstall"){
    console.log("user uninstalling ");
    res.sendStatus(200);
  }
  else{
  oauth2Client.setCredentials(getGoogleSettings());
  console.log("in the /screwdrive command")
  console.log(req.body);
  console.log(req.body.userId)
  var initiator_user_id = req.body.userId;
  var receiver_user_id = req.body.chat;
  var initiator_settings = getSettings(initiator_user_id);
  var receiver_settings = getSettings(receiver_user_id)
  console.log(initiator_settings);
  console.log("test data"+ listFiles(oauth2Client,receiver_settings.userId,initiator_settings.token, req.body.text));
  res.sendStatus(200);
}
});

app.get('/googleredirect', function(req,res){
  var code = req.query.code;
  var searchstring = req.query.test;
  console.log(req.query);
  console.log(req.body);
  oauth2Client.getToken(code, function (err, tokens) {
  // Now tokens contains an access_token and an optional refresh_token. Save them.
  if (!err) {
    console.log(tokens);
    oauth2Client.setCredentials(tokens);
    saveGoogleSettings(tokens);
    // listFiles(oauth2Client);
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
    state: { test: "test" }
  });

  res.redirect(url);
});

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth,userId,token,query) {
  var service = google.drive('v3');
  var output = "Nothing";
  service.files.list({
    auth: auth,
    pageSize: 100,
    fields: "nextPageToken, files(id, name, owners,webViewLink)",
    q: query
    // q: "name contains 'CS231n'"
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      output = "Error searching";
    }
    var files = response.files;
    if (files.length == 0) {
      console.log('No files found.');
      output =  "No files found."
    } else {
      console.log('Files:');
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        console.log(files)
        console.log('%s (%s) link: %s', file.name, file.id, file.owners);
      }
      output =  files[0].webViewLink;
    }
    request("https://api.flock.co/v1/chat.sendMessage?to="+userId+"&text="+output+"&token="+token, function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the HTML for the Google homepage.
    });
  });
}


app.listen(8080);
