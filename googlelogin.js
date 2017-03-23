var google = require('googleapis');
var fs = require('fs');
var express = require('express')
var app = express();

var OAuth2 = google.auth.OAuth2;

// Load client secrets from a local file.
googledata = JSON.parse(fs.readFileSync('keys/client_secret.json').toString());

var oauth2Client = new OAuth2(
  googledata.web.client_id,
  googledata.web.client_secret,
  googledata.web.redirect_uris[1]
);

// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

app.get('/flock', function(req,res){
  res.send();
});

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
