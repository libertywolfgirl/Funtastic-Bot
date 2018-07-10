const AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk

const assistant = new AssistantV1({
            username: process.env.ASSISTANT_USERNAME,
            password: process.env.ASSISTANT_PASSWORD,
            url: process.env.ASSISTANT_URL,
            version: 'v1',
            version_date: '2017-05-26'
        });

const ConversationService = (function() {
    return {
        sendMessage: function(message, context) {
                
            }
        }
})();

module.exports = ConversationService;
