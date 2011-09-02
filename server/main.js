#!/usr/bin/env node

// require libraries that we depend on 
const
express = require('express'),
sessions = require('connect-cookie-session'),
path = require('path'),
postprocess = require('postprocess'),
https = require('https'),
querystring = require('querystring');

// the key with which session cookies are encrypted
const COOKIE_SECRET = process.env.SEKRET || 'you love, i love, we all love beer!';

var app = express.createServer();

// do some logging
app.use(express.logger({ format: 'dev' }));

// parse cookies
app.use(express.cookieParser());

// parse post bodies
app.use(express.bodyParser());

// session support using encrypted cookies
var cookieSession = sessions({
  secret: COOKIE_SECRET,
  key: 'myfavoritebeer_session',
  cookie: {
    path: '/api',
    httpOnly: true,
    // when you're logged in, you're logged in for an hour
    maxAge: (1 * 60 * 1000), 
    secure: false
  }
});
app.use(function (req, res, next) {
  if (/^\/api/.test(req.url)) return cookieSession(req, res, next);
  return next();
});

// a substitution middleware allows us to easily point at different browserid servers
if (process.env.BROWSERID_URL) {
  console.log("Using BrowserID at: " + process.env.BROWSERID_URL);
  app.use(postprocess.middleware(function(body) {
    return body.toString().replace(new RegExp("https://browserid.org", 'g'), process.env.BROSWERID_URL);
  }));
}

// and now for the wsapi api
app.get("/api/whoami", function (req, res) {
  if (req.session && typeof req.session.email === 'string') return res.json(req.session.email);
  return res.json(null);
});

app.post("/api/login", function (req, res) {
  // req.body.assertion contains an assertion we should
  // verify, we'll use the browserid verification console
  var vreq = https.request({
    host: "browserid.org",
    path: "/verify",
    method: 'POST'
  }, function(vres) {
    var body = "";
    vres.on('data', function(chunk) { body+=chunk; } )
      .on('end', function() {
        console.log(body);
        res.json(false);
        });
  });
  vreq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
  var data = querystring.stringify({
    assertion: req.body.assertion,
    audience: '127.0.0.1:3000' // XXX
  });
  vreq.setHeader('Content-Length', data.length);
  vreq.write(data);
  vreq.end();
});

app.post("/api/logout", function (req, res) {
  console.log("logout called");
  res.json(false);
});

app.get("/api/get", function (req, res) {
  console.log("you want to get your favorite beer, eh?");
  res.json(false);
});

app.get("/api/set", function (req, res) {
  console.log("you want to set your favorite beer, eh?");
  res.json(false);
});

// serve static resources
app.use(express.static(path.join(path.dirname(__dirname), "static")));

app.listen(process.env.PORT || 0, '127.0.0.1', function () {
  console.log("listening on http://127.0.0.1:" + app.address().port);
});
