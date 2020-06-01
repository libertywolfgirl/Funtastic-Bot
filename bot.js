//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const path = require("path");
//const Watson = require('watson-developer-cloud'); // watson sdk
const AssistantV2 = require("ibm-watson/assistant/v2");
const { IamAuthenticator } = require("ibm-watson/auth");

/*const assistant = new Watson.ConversationV2({
            apiKey: process.env.ASSISTANT_APIKEY,
            url: process.env.ASSISTANT_URL,
            version: 'v2',
            version_date: '2017-05-26'
        });*/

const assistant = new AssistantV2({
  version: "2020-04-01",
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_APIKEY
  }),
  url: process.env.ASSISTANT_URL
});

var messengerButton =
  '<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href="https://developers.facebook.com/docs/messenger-platform/guides/quick-start">docs</a>.<script src="https://button.glitch.me/button.js" data-style="glitch"></script><div class="glitchButton" style="position:fixed;top:20px;right:20px;"></div></body></html>';

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// Webhook validation
app.get("/webhook", function(req, res) {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.VERIFY_TOKEN
  ) {
    console.log("Validating webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

// Display the web page
app.get("/", function(req, res) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write(messengerButton);
  res.end();
});

const assistantID = process.env.ASSISTANT_ID;
let sessionID;

// Create session.
assistant
  .createSession({
    assistantId: assistantID
  })
  .then(res => {
    sessionID = res.result.session_id;
    /*sendMessage({
      messageType: 'text',
      text: '', // start conversation with empty message
    });*/
  })
  .catch(err => {
    console.log(err); // something went wrong
  });

app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === "page") {
    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      //console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log("Sender PSID: " + sender_psid);

      // Iterate over each messaging event
      entry.messaging.forEach((assistantId, sessionId, webhook_event) => {
      if (webhook_event.message) {
      //entry.messaging.forEach(function(event) {
        //if (event.message) {
          console.log("Received message");
          handleMessage(sender_psid, webhook_event.message);
          var payload = {
            assistantId: assistantID,
            sessionId: sessionID,
            input: webhook_event.message
          };
          /*assistant.message(payload, function(err, result) {
            if (err) {
              console.log("error");
              console.log(err);
              //return res.status(err.code || 500).json(err);
            }
          });*/
          assistant
            .message({
              assistantId: assistantID,
              sessionId: sessionID,
              input: {
                message_type: "text",
                text: "Hello"
              }
            })
            .then(res => {
              console.log(JSON.stringify(res.result, null, 2));
            })
            .catch(err => {
              console.log(err);
            });
        } else if (webhook_event.postback) {
          handlePostback(sender_psid, webhook_event.postback);
        } else {
          console.log("Webhook received unknown event: ", webhook_event);
        }
      });
    });
 
    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// Incoming events handling
/*function receivedMessage(webhook_event, watsonResponse) {
  var senderID = webhook_event.sender.id;
  var recipientID = webhook_event.recipient.id;
  var timeOfMessage = webhook_event.timestamp;
  var message = webhook_event.message;

  console.log(
    "Received message for user %d and page %d at %d with message:",
    senderID,
    recipientID,
    timeOfMessage
  );
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;

  if (messageText) {
    sendTextMessage(senderID, watsonResponse.output.text[0]);
  }
}*/

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: "POST",
      json: messageData
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        console.log(
          "Successfully sent generic message with id %s to recipient %s",
          messageId,
          recipientId
        );
      } else {
        console.error("Unable to send message.");
        console.error(response);
        console.error(error);
      }
    }
  );
}

// Check if the event is a message or postback and
// pass the event to the appropriate handler function
/*if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});*/

function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {
    // Create the payload for a basic text message
    response = {
      text: `You sent the message: "${received_message.text}". Now send me an image!`
    };
  } else if (received_message.attachments) {
    // Gets the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Is this the right picture?",
              subtitle: "Tap a button to answer.",
              image_url: attachment_url,
              buttons: [
                {
                  type: "postback",
                  title: "Yes!",
                  payload: "yes"
                },
                {
                  type: "postback",
                  title: "No!",
                  payload: "no"
                }
              ]
            }
          ]
        }
      }
    };
  }

  // Sends the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;

  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === "yes") {
    response = { text: "Thanks!" };
  } else if (payload === "no") {
    response = { text: "Oops, try sending another image." };
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

/*function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body
    },
    (err, res, body) => {
      if (!err) {
        console.log("message sent!");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}*/

// Message processing
/*app.post("/webhook", function(req, res) {
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === "page") {
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;
      
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          console.log("Received message");
          const assistantID = process.env.ASSISTANT_ID;
          var payload = {
            assistant_id: assistantID,
            session_id: req.body.session_id,
            input: {
              message_type : 'text',
              options : {
                return_context : true
                }
            }
          };
          assistant.message(payload, function(err, data) {
            if (err) {
              console.log("error");
              console.log(err);
              return res.status(err.code || 500).json(err);
            }
            receivedMessage(event, data);
          });
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    //res.sendStatus(200);
  }
});

// Incoming events handling
function receivedMessage(event, watsonResponse) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log(
    "Received message for user %d and page %d at %d with message:",
    senderID,
    recipientID,
    timeOfMessage
  );
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;

  if (messageText) {
    sendTextMessage(senderID, watsonResponse.output.text[0]);
  }
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: "POST",
      json: messageData
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        console.log(
          "Successfully sent generic message with id %s to recipient %s",
          messageId,
          recipientId
        );
      } else {
        console.error("Unable to send message.");
        console.error(response);
        console.error(error);
      }
    }
  );
}*/

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function() {
  console.log("Listening on port %s", server.address().port);
});
