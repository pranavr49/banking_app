/*eslint-env browser */
// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var ConversationPanel = (function() {
  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.from-user',
      fromWatson: '.from-watson',
      latest: '.latest'
    },
    authorTypes: {
      user: 'user',
      watson: 'watson'
    }
  };

  // Publicly accessible methods defined
  return {
    init: init,
    inputKeyDown: inputKeyDown,
	nluSubmit: nluSubmit
  };

  // Initialize the module
  function init() {
    chatUpdateSetup();
    Api.sendRequest( '', null );
    setupInputBox();
  }
  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayloadStr) {
      currentResponsePayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.watson);
    };
  }

  function setupInputBox() {
    var input = document.getElementById('textInput');
    var dummy = document.getElementById('textInputDummy');
    var padding = 3;

    if (dummy === null) {
      var dummyJson = {
        'tagName': 'div',
        'attributes': [{
          'name': 'id',
          'value': 'textInputDummy'
        }]
      };

      dummy = Common.buildDomElement(dummyJson);
      ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height', 'text-transform', 'letter-spacing'].forEach(function(index) {
        dummy.style[index] = window.getComputedStyle( input, null ).getPropertyValue( index );
      });

      document.body.appendChild(dummy);
    }

    input.addEventListener('input', function() {
      if (this.value === '') {
        this.classList.remove('underline');
        this.setAttribute('style', 'width:' + '100%');
        this.style.width = '100%';
      } else {
        this.classList.add('underline');
        var txtNode = document.createTextNode(this.value);
        dummy.textContent = txtNode.textContent;		
        var widthValue = ( dummy.offsetWidth + padding) + 'px';
        this.setAttribute('style', 'width:' + widthValue);
        this.style.width = widthValue;
      }
    });

    Common.fireEvent(input, 'input');
  }

  // Display a user or Watson message that has just been sent/received
  function displayMessage(newPayload, typeValue) {
    var isUser = isUserMessage(typeValue);
    var textExists = (newPayload.input && newPayload.input.text) ||
        (newPayload.output && newPayload.output.text);
    if (isUser !== null && textExists) {
      // Create new message DOM element
      var messageDivs = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser ?
          settings.selectors.fromUser : settings.selectors.fromWatson) +
          settings.selectors.latest);
      // Previous "latest" message is no longer the most recent
      if (previousLatest) {
        Common.listForEach(previousLatest, function(element) {
          element.classList.remove('latest');
        });
      }

      messageDivs.forEach(function(currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });
      // Move chat to the most recent messages when new messages are added
      scrollToChatBottom();
    }
  }

  // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
  // Returns true if user, false if Watson, and null if neither
  // Used to keep track of whether a message was from the user or Watson
  function isUserMessage(typeValue) {
    if (typeValue === settings.authorTypes.user) {
      return true;
    } else if (typeValue === settings.authorTypes.watson) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element from a message payload
  function buildMessageDomElements(newPayload, isUser) {
    var textArray = isUser ? newPayload.input.text : newPayload.output.text;
    if (Object.prototype.toString.call( textArray ) !== '[object Array]') {
      textArray = [textArray];
    }
    var messageArray = [];

    var context;
    var latestResponse = Api.getResponsePayload();
	context = latestResponse.context;
	console.log(context);
	if(context.nlu_output){
		var nlu_obj = context.nlu_output;		
		document.getElementById("sentiment_score").innerHTML = nlu_obj.sentiment.document.score;
		document.getElementById("sentiment_label").innerHTML = nlu_obj.sentiment.document.label;
		
		
		document.getElementById("keyword1").innerHTML = nlu_obj.keywords['0'].text;
		document.getElementById("keyword1_sentimentscore").innerHTML = nlu_obj.keywords['0'].sentiment.score;
		document.getElementById("keyword1_sentiment").innerHTML = nlu_obj.keywords['0'].sentiment.label;
		document.getElementById("keyword1_sadness").innerHTML = nlu_obj.keywords['0'].emotion.sadness;
		document.getElementById("keyword1_joy").innerHTML = nlu_obj.keywords['0'].emotion.joy;		
		document.getElementById("keyword1_fear").innerHTML = nlu_obj.keywords['0'].emotion.fear;
		document.getElementById("keyword1_disgust").innerHTML = nlu_obj.keywords['0'].emotion.disgust;
		document.getElementById("keyword1_anger").innerHTML = nlu_obj.keywords['0'].emotion.anger;		
		
		document.getElementById("keyword2").innerHTML = nlu_obj.keywords['1'].text;
		document.getElementById("keyword2_sentimentscore").innerHTML = nlu_obj.keywords['1'].sentiment.score;
		document.getElementById("keyword2_sentiment").innerHTML = nlu_obj.keywords['0'].sentiment.label;
		document.getElementById("keyword2_sadness").innerHTML = nlu_obj.keywords['0'].emotion.sadness;
		document.getElementById("keyword2_joy").innerHTML = nlu_obj.keywords['0'].emotion.joy;		
		document.getElementById("keyword2_fear").innerHTML = nlu_obj.keywords['0'].emotion.fear;
		document.getElementById("keyword2_disgust").innerHTML = nlu_obj.keywords['0'].emotion.disgust;
		document.getElementById("keyword2_anger").innerHTML = nlu_obj.keywords['0'].emotion.anger;	
		
	}
	 
	   /* 	console.log(context);
		var dob = context.Date_Of_Birth;
		var e_d = context.Existing_Disease;
		var f_h = context.Family_History;
		if(typeof dob != 'undefined' && typeof e_d != 'undefined' && typeof f_h != 'undefined' ){
			console.log(dob);
			console.log(e_d);
			console.log(f_h);
			        var messageJson = {
          // <div class='segments'>
          'tagName': 'div',
          'classNames': ['segments'],
          'children': [{
            // <div class='from-user/from-watson latest'>
            'tagName': 'div',
            'classNames': [('from-watson'), 'latest', ((messageArray.length === 0) ? 'top' : 'sub')],
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': ['message-inner'],
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': 'Your details are as below,<br/> Age : '+ dob +' <br/>Existing Disease : '+ e_d +' <br/>Family History : '+ f_h +' <br/> depending upon your details <b>Single Floater plociy</b> is suggested for you, <br/> Can i process with your policy <br/><input type="button" value="yes" onClick="sendYes();"> <input type="button" value="No" onClick="sendNo();">'
              }]
            }]
          }]
        };
        messageArray.push(Common.buildDomElement(messageJson));
	
		}*/
		//end of if loop

    return messageArray;
  }

  // Scroll to the bottom of the chat window (to the most recent messages)
  // Note: this method will bring the most recent user message into view,
  //   even if the most recent message is from Watson.
  //   This is done so that the "context" of the conversation is maintained in the view,
  //   even if the Watson message is long.
  function scrollToChatBottom() {
    var scrollingChat = document.querySelector('#scrollingChat');
    // Scroll to the latest message sent by the user
    var scrollEl = scrollingChat.querySelector(settings.selectors.fromUser + settings.selectors.latest);
    if (scrollEl) {
      scrollingChat.scrollTop = scrollEl.offsetTop;
    }
  }

  // Handles the submission of input
  function inputKeyDown(event, inputBox) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputBox.value) {
      // Retrieve the context from the previous server response
      var context;
      var latestResponse = Api.getResponsePayload();
	 
      if (latestResponse) {
        context = latestResponse.context;
		
      }

      // Send the user message
      Api.sendRequest(inputBox.value, context);

      // Clear input box for further messages
      inputBox.value = '';
      Common.fireEvent(inputBox, 'input');
    }
  }
  
    function nluSubmit() {
		
		 var inputBox = $('#textInput1').val();
    // Submit on enter key, dis-allowing blank messages
        var context;
      var latestResponse = Api.getResponsePayload();
	 
      if (latestResponse) {
        context = latestResponse.context;		
      }

      // Send the user message
      Api.sendRequest(inputBox, context);

      
    }
  
}());





