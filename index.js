const express = require("express");
const morgan = require("morgan");
const passport = require("passport");
const config = require("./config.json");
const fetch = require("node-fetch");

// read in env settings
require("dotenv").config();
const auth = require("./auth");

const todolist = require("./todolist");
const cors = require("cors");

//<ms_docref_import_azuread_lib>
const BearerStrategy = require("passport-azure-ad").BearerStrategy;
//</ms_docref_import_azuread_lib>

global.global_todos = [];

//<ms_docref_azureadb2c_options>
const options = {
  identityMetadata: `https://${config.credentials.tenantName}.b2clogin.com/${config.credentials.tenantName}.onmicrosoft.com/${config.policies.policyName}/${config.metadata.version}/${config.metadata.discovery}`,
  clientID: config.credentials.clientID,
  audience: config.credentials.clientID,
  policyName: config.policies.policyName,
  isB2C: config.settings.isB2C,
  validateIssuer: config.settings.validateIssuer,
  loggingLevel: config.settings.loggingLevel,
  passReqToCallback: config.settings.passReqToCallback,
};

const bearerStrategy = new BearerStrategy(options, (token, done) => {
  // Send user info using the second argument
  done(null, {}, token);
});

app.use(express.json());

//enable CORS (for testing only -remove in production/deployment)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  console.log("Validated claims: ", req.authInfo);
  res.status(200).json({ message: "Hi there!" });
});

// API endpoint
app.get(
  "/hello",
  passport.authenticate("oauth-bearer", { session: false }),
  (req, res) => {
    console.log("Validated claims: ", req.authInfo);

    // Service relies on the name claim.
    res.status(200).json({ name: req.authInfo["name"] });
  }
);

// API endpoint
app.get(
  "/me",
  passport.authenticate("oauth-bearer", { session: false }),
  async (req, res) => {
    console.log("Validated claims: ", req.authInfo);

    try {
      // here we get an access token
      const authResponse = await auth.getToken(auth.tokenRequest);

      // call the web API with the access token
      const me = await callApi(
        auth.apiConfig.uri + `/${req.authInfo["oid"]}`,
        authResponse.accessToken
      );

      // display result
      let {
        id,
        displayName: name,
        givenName: first_name,
        surname: last_name,
        userPrincipalName: email,
      } = me;
      let meFormatted = { id, name, first_name, last_name, email };

      meFormatted.name === "unknown"
        ? (meFormatted.name = `${me.givenName} ${me.surname}`)
        : (meFormatted.name = "unknown");

      console.log(meFormatted);
      res.status(200).json(meFormatted);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// API anonymous endpoint, returns a date to the caller.
app.get("/public", (req, res) => res.send({ date: new Date() }));

/**
 * Calls the endpoint with authorization bearer token.
 * @param {string} endpoint
 * @param {string} accessToken
 */
async function callApi(endpoint, accessToken) {
  const opts = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  console.log("request made to web API at: " + new Date().toString());

  return fetch(endpoint, opts)
    .then((response) => response.json())
    .catch((error) => console.log(error));
}

const port = process.env.PORT || 5500;

app.listen(port, () => {
  console.log("Listening on port " + port);
});
