'use strict';

require('dotenv').config({
  silent: true
});

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const watson = require('watson-developer-cloud'); // watson sdk
const fs = require('fs'); // file system for loading JSON

const numeral = require('numeral');
const vcapServices = require('vcap_services');

const bankingServices = require('./banking_services');

const WatsonConversationSetup = require('./lib/watson-conversation-setup');
const Cloudant  = require('@cloudant/cloudant');

const DEFAULT_NAME = 'Banking-chatbot';

const LOOKUP_NEWBENEFICIARY = 'newbeneficiary';
const LOOKUP_TRANSFERMONEY = 'transfermoney';
const LOOKUP_PAYEE = 'payee';
var rn = require('random-number');
var options = {
  min:  11111,
  integer: true
}


const app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// setupError will be set to an error message if we cannot recover from service setup or init error.
let setupError = '';

var cloudant = Cloudant({url: 'https://b351c732-7555-4817-bd11-0f8218b1dbba-bluemix:0eba437dd54be9a990113d8b5f4183001e4619acd7c43f881b976b61fa7fea9e@b351c732-7555-4817-bd11-0f8218b1dbba-bluemix.cloudant.com'});
var dbname = 'banking_app';
var db = null;
var doc = null;
db = cloudant.db.use(dbname);



// Create the service wrapper
let conversationCredentials = vcapServices.getCredentials('conversation');
let conversationUrl = conversationCredentials.url;
let conversationUsername = conversationCredentials.username;
let conversationPassword = conversationCredentials.password;
if (process.env.service_watson_discovery !== undefined) {
  conversationCredentials = JSON.parse(process.env.service_watson_conversation);
  conversationUrl = conversationCredentials['url'];
  conversationUsername = conversationCredentials['username'];
  conversationPassword = conversationCredentials['password'];
}
const conversation = watson.conversation({
  url: conversationUrl,
  username: conversationUsername,
  password: conversationPassword,
  version_date: '2016-07-11',
  version: 'v1'
});

let workspaceID; // workspaceID will be set when the workspace is created or validated.
const conversationSetup = new WatsonConversationSetup(conversation);
const workspaceJson = JSON.parse(fs.readFileSync('data/conversation/workspaces/insurance.json'));
const conversationSetupParams = { default_name: DEFAULT_NAME, workspace_json: workspaceJson };
conversationSetup.setupConversationWorkspace(conversationSetupParams, (err, data) => {
  if (err) {
    handleSetupError(err);
  } else {
    console.log('Watson Assistant is ready!');
    workspaceID = data;
  }
});

let toneAnalyzerCredentials = vcapServices.getCredentials('tone_analyzer');
let toneAnalyzerUrl = toneAnalyzerCredentials.url;
let toneAnalyzerUsername = toneAnalyzerCredentials.username;
let toneAnalyzerPassword = toneAnalyzerCredentials.password;
if (process.env.service_watson_discovery !== undefined) {
  toneAnalyzerCredentials = JSON.parse(process.env.service_watson_tone_analyzer);
  toneAnalyzerUrl = toneAnalyzerCredentials['url'];
  toneAnalyzerUsername = toneAnalyzerCredentials['username'];
  toneAnalyzerPassword = toneAnalyzerCredentials['password'];
}
const toneAnalyzer = watson.tone_analyzer({
  url: toneAnalyzerUrl,
  username: toneAnalyzerUsername,
  password: toneAnalyzerPassword,
  version: 'v3',
  version_date: '2016-05-19'
});

/* ******** NLU ************ */
let naturalLanguageUnderstandingCredentials = vcapServices.getCredentials('natural-language-understanding');
let naturalLanguageUnderstandingUrl = naturalLanguageUnderstandingCredentials.url;
let naturalLanguageUnderstandingUsername = naturalLanguageUnderstandingCredentials.username;
let naturalLanguageUnderstandingPassword = naturalLanguageUnderstandingCredentials.password;
if (process.env.service_watson_discovery !== undefined) {
  naturalLanguageUnderstandingCredentials = JSON.parse(process.env.service_watson_natural_language_understanding);
  naturalLanguageUnderstandingUrl = naturalLanguageUnderstandingCredentials['url'];
  naturalLanguageUnderstandingUsername = naturalLanguageUnderstandingCredentials['username'];
  naturalLanguageUnderstandingPassword = naturalLanguageUnderstandingCredentials['password'];
}
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const nlu = new NaturalLanguageUnderstandingV1({
  url: naturalLanguageUnderstandingUrl,
  username: naturalLanguageUnderstandingUsername,
  password: naturalLanguageUnderstandingPassword,
  version_date: '2017-02-27'
});

// Endpoint to be called from the client side
app.post('/api/message', function(req, res) {
  if (setupError) {
    return res.json({ output: { text: 'The app failed to initialize properly. Setup and restart needed.' + setupError } });
  }

  if (!workspaceID) {
    return res.json({
      output: {
        text: 'Assistant initialization in progress. Please try again.'
      }
    });
  }

  bankingServices.getPerson(7829706, function(err, person) {
    if (err) {
      console.log('Error occurred while getting person data ::', err);
      return res.status(err.code || 500).json(err);
    }

    const payload = {
      workspace_id: workspaceID,
      context: {
        person: person,
		//action:{ policyMetadata: 'false', policySuggest: 'false' , directToLiveAgent: 'false'}
      },
      input: {}
    };

    // common regex patterns
    const regpan = /^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/;
    // const regadhaar = /^\d{12}$/;
    // const regmobile = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;
    if (req.body) {
      if (req.body.input) {
        let inputstring = req.body.input.text;
        console.log('input string ', inputstring);
        const words = inputstring.split(' ');
        console.log('words ', words);
        inputstring = '';
        for (let i = 0; i < words.length; i++) {
          if (regpan.test(words[i]) === true) {
            // const value = words[i];
            words[i] = '1111111111';
          }
          inputstring += words[i] + ' ';
        }
        // words.join(' ');
        inputstring = inputstring.trim();
        console.log('After inputstring ', inputstring);
        // payload.input = req.body.input;
        payload.input.text = inputstring;
      }
      if (req.body.context) {
        // The client must maintain context/state
        payload.context = req.body.context;
      }
    }

    /* if (req.body) {
        if (req.body.input) {
            payload.input = req.body.input;
                        }
        if (req.body.context) {
            // The client must maintain context/state
            payload.context = req.body.context;
        }

    } */

    callconversation(payload);
  });

  /**
   * Send the input to the conversation service.
   * @param payload
   */
  function callconversation(payload) {
    const queryInput = JSON.stringify(payload.input);
    // const context_input = JSON.stringify(payload.context);

    toneAnalyzer.tone(
      {
        text: queryInput,
        tones: 'emotion'
      },
      function(err, tone) {
        let toneAngerScore = '';
        if (err) {
          console.log('Error occurred while invoking Tone analyzer. ::', err);
          // return res.status(err.code || 500).json(err);
        } else {
          const emotionTones = tone.document_tone.tone_categories[0].tones;

          const len = emotionTones.length;
          for (let i = 0; i < len; i++) {
            if (emotionTones[i].tone_id === 'anger') {
              console.log('Input = ', queryInput);
              console.log('emotion_anger score = ', 'Emotion_anger', emotionTones[i].score);
              toneAngerScore = emotionTones[i].score;
              break;
            }
          }
        }

        payload.context['tone_anger_score'] = toneAngerScore;

        if (payload.input.text != '') {
          // console.log('input text payload = ', payload.input.text);
          const parameters = {
            text: payload.input.text,
            features: {
				sentiment:{},
				concepts: {
					limit: 3
				},
              entities: {
                emotion: true,
                sentiment: true,
                limit: 2
              },
              keywords: {
                emotion: true,
                sentiment: true,
                limit: 2
              }
            }
          };

          nlu.analyze(parameters, function(err, response) {
            if (err) {
              console.log('error:', err);
            } else {
              const nluOutput = response;

              payload.context['nlu_output'] = nluOutput;
         //    console.log('NLUNLUNLUNLUNLU = ', + payload.context['nlu_output']);
              // identify location
              const entities = nluOutput.entities;
              let location = entities.map(function(entry) {
                if (entry.type == 'Location') {
                  return entry.text;
                }
              });
              location = location.filter(function(entry) {
                if (entry != null) {
                  return entry;
                }
              });
              if (location.length > 0) {
                payload.context['Location'] = location[0];
                console.log('Location = ', payload.context['Location']);
              } else {
                payload.context['Location'] = '';
              }

              
            }

            conversation.message(payload, function(err, data) {
              if (err) {
                return res.status(err.code || 500).json(err);
              } else {
                console.log('conversation.message1 :: ', JSON.stringify(data));				
                // lookup actions
                checkForLookupRequests(data, function(err, data) {
                  if (err) {
                    return res.status(err.code || 500).json(err);
                  } else {
                    return res.json(data);
                  }
                });
              }
            });
          });
        } else {
          conversation.message(payload, function(err, data) {
            if (err) {
              return res.status(err.code || 500).json(err);
            } else {
              console.log('conversation.message :: ', JSON.stringify(data));
              return res.json(data);
            }
          });
        }
      }
    );
  }
});

/**
 * Looks for actions requested by conversation service and provides the requested data.
 */
function checkForLookupRequests(data, callback) {
  console.log('checkForLookupRequests');

  if (data.context && data.context.action && data.context.action.lookup && data.context.action.lookup != 'complete') {
    const payload = {
      workspace_id: workspaceID,
      context: data.context,
      input: data.input
    };

    // conversation requests a data lookup action
	if (data.context.action.lookup === LOOKUP_PAYEE){
		console.log('Payee lookup');
		  if (data.context.action.account_type && data.context.action.account_type != '') {
			  
			  db.find({selector:{cust_id:'cust_1', doc_type:'benificiary',}}, function(er, result) {
  if (er) {
    throw er;
  }

  console.log('Found %d documents with name cust1', result.docs.length);
  console.log('docs', result.docs);
  
  for (var i = 0; i < result.docs.length; i++) {
    console.log('  Doc id: %s', result.docs[i]._id);
  }
  payload.context['list_payee'] = result.docs;
  payload.context['list_payee_counter'] = result.docs.length;
  
  payload.context.action = {};
  conversation.message(payload, function(err, data) {
              if (err) {
                console.log('Error while calling conversation.message with lookup result', err);
                callback(err, null);
              } else {
                console.log('checkForLookupRequests conversation.message :: ', JSON.stringify(data));
                callback(null, data);
              }
            });
});

			data.context.action = {};
        
      }
	} else if (data.context.action.lookup === LOOKUP_NEWBENEFICIARY){
		console.log('LOOKUP_NEWBENEFICIARY');
		payload.context['add_beneficiary'] = 'true'
		payload.context.action = {};
		db.find({selector:{cust_id:'cust_1', doc_type:'benificiary',}}, function(er, result) {
			  if (er) {
					throw er;
					}
					var doc_count=result.docs.length + 1;
					var doc_id = "benf_"
					doc_id += doc_count;
				
		
			var doc = {
				  "_id": doc_id,
				  "cust_id": "cust_1",
				  "doc_type": "benificiary",
				  "benificiary_name": data.context.benf_name,
				  "benf_account_no": data.context.benf_actno
				}
		db.insert(doc, function (er, result) {
			  if (er) {
				throw er;
			  }

		console.log('Created document ');
		
		});
	});
		 conversation.message(payload, function(err, data) {
              if (err) {
                console.log('Error while calling conversation.message with lookup result', err);
                callback(err, null);
              } else {
                console.log('checkForLookupRequests conversation.message :: ', JSON.stringify(data));
                callback(null, data);
              }
            });
				data.context.action = {};
	} else if (data.context.action.lookup === LOOKUP_TRANSFERMONEY){
		
		console.log('LOOKUP_TRANSFERMONEY');
		payload.context['transfer_money'] = 'true';
		var trans_id=rn(options);
		payload.context['transaction_id'] = trans_id;
		
			 db.get('cust_1', { revs_info: true }, function(err, doc) {

   if (!err) {
	    doc.account_balance=doc.account_balance-data.context.transfermoney;
		doc.transaction.benf_name=data.context.benf_name;
		doc.transaction.benf_actno=data.context.benf_actno;
		doc.transaction.benf_transfer_amount=data.context.transfermoney;
		doc.transaction.transaction_id=trans_id;
       db.insert(doc, doc.id, function(err, doc) {
        if(err) {
           console.log('Error inserting data\n'+err);
           return 500;
        }
        return 200;
     });
   }
});
		
		 conversation.message(payload, function(err, data) {
              if (err) {
                console.log('Error while calling conversation.message with lookup result', err);
                callback(err, null);
              } else {
                console.log('checkForLookupRequests conversation.message :: ', JSON.stringify(data));
                callback(null, data);
              }
            });
	}
    
  } else {
    callback(null, data);
    return;
  }
}

/**
 * Handle setup errors by logging and appending to the global error text.
 * @param {String} reason - The error message for the setup error.
 */
function handleSetupError(reason) {
  setupError += ' ' + reason;
  console.error('The app failed to initialize properly. Setup and restart needed.' + setupError);
  // We could allow our chatbot to run. It would just report the above error.
  // Or we can add the following 2 lines to abort on a setup error allowing Bluemix to restart it.
  console.error('\nAborting due to setup error!');
  process.exit(1);
}

module.exports = app;
