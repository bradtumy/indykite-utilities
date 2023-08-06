import { IdentityClient } from "@indykiteone/indykite-sdk-node"

// Create a random number
function between(min, max) {
  return Math.floor(
    Math.random() * (max - min) + min
  )
}

// strip off any extra characters in front of token header
function cleanToken(header) {
  const tokenValue = header.split(' ');
  
  if (tokenValue.length === 2) {
    const token = tokenValue[1];
    return token;
  }
    return;
}

// create a connection to the IndyKite Service
async function ikClient () {
  const indykiteConnection = await IdentityClient.createInstance();
  return indykiteConnection;
}

// Call IndyKite and check if the auth token is still valid
async function validateToken (authToken) {
   const sdk = await ikClient();
   const token = cleanToken(authToken);
   const tokenInfo = await sdk.introspectToken(token);
   //console.log("Token: ", token);
   //console.log("tokenInfo: ", tokenInfo);
   return tokenInfo;
}

// pull the auth token from the request header and process to make sure that the client is authorized
export async function isAuthorized (request, response, next) {
  const token = request.headers.authorization;
  const tokenValid = await validateToken(token);
  if (!tokenValid.active) {
      //console.log("Token Valid: ", tokenValid);
      response.status(400).json({"Session" : tokenValid})
  } else {
      //console.log("Token Valid: ", tokenValid);
      next();
  }
}

// Check the status of an email invite
export async function checkInvite(req, res, next) {
  const sdk = await ikClient();
  const refId = req.params['id'];
  try {
    const inviteStatus = await sdk.checkInvitationState( { referenceId: refId } );
    res.status(200).json({"msg": inviteStatus});
    next();
  } catch (error) {
    console.log(error);
    res.status(400).json({"msg": error});
    next();
  }
}

// Send an email invite for a new user to register and create an identity 
export async function sendEmailInvite(req,res, next) {
  const sdk = await ikClient();
  const authToken = req.headers.authorization;
  const token = cleanToken(authToken)
  const myDigitalTwin = await sdk.getDigitalTwinByToken(token,["email"]);
  const dt = myDigitalTwin.digitalTwin;
  const tenantId = await dt.tenantId;

  // generate a random number for the referenceId
  const randomNumber = between(1000000000,100000000000);
  const referenceId = randomNumber.toString();

  // need the invitee (email), tenantId and referenceid to create a new inviation
  const result = await sdk.createEmailInvitation(req.body.invitee, tenantId, referenceId); // indykite just returns a void object here so we can't do a boolean check on the status.

  if (referenceId) {
    res.status(200).json(referenceId)
    next();
  }

  return referenceId;
  next();
}