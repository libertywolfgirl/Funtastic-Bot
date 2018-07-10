const AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk

const ConversationService = (function() {
    const _initService = () => {
        return new AssistantV1({
            username: process.env.ASSISTANT_USERNAME,
            password: process.env.ASSISTANT_PASSWORD,
            url: process.env.ASSISTANT_URL,
            version: 'v1',
            version_date: '2017-05-26'
        });
    };
    return {
        sendMessage: function(message, context) {
                const conversation = _initService();
                const workspaceID = process.env.ASSISTANT_WORKSPACEID;
                conversation.message(
                    {
                        workspace_id: workspaceID,
                        input: { text: (message.text || '').replace(/(\r\n\t|\n|\r\t)/gm, '') },
                        context: context
                    },
                );
                assistant.message(payload, function (err, data) {
                  if (err) {
                    return res.status(err.code || 500).json(err);
                  }
                  return res.json(updateMessage(payload, data));
              });
            }
        }
})();

module.exports = ConversationService;
