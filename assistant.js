const AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk

const ConversationService = (function() {
    const _initService = () => {
        const credentials = process.env.WATSON_CONVERSATION_SERVICE_NAME;
        return new AssistantV1({
            username: .username,
            password: credentials.password,
            url: credentials.url,
            version: 'v1',
            version_date: '2017-05-26'
        });
    };
    return {
        sendMessage: function(message, context, success) {
            ConversationHooks.before(context, message, () => {
                const conversation = _initService();
                const workspaceID = (context.searchStations == true) ? "searchStations" : context.language;
                conversation.message(
                    {
                        workspace_id: EnvSettings.getWatsonWorkspace(workspaceID),
                        input: { text: (message.text || '').replace(/(\r\n\t|\n|\r\t)/gm, '') },
                        context: context
                    },
                    function(err, response) {
                        if (err) {
                            /* eslint-disable no-console */
                            console.log('[ERROR] ConversationService.sendMessage');
                            console.log(err);
                            /* eslint-enable no-console */
                        }
                        const overrideIntent = get(response, 'context.intent');
                        if (overrideIntent) {
                            response.intents = [{ intent: overrideIntent, confidence: 1 }];
                            delete response.context.intent;
                        }
                        ConversationHooks.after(response, message, afterResponse => {
                            if (afterResponse && afterResponse.fetchConversation) {
                                const fetchMessage = afterResponse.fetchMessage || '';
                                delete afterResponse.fetchConversation;
                                delete afterResponse.fetchMessage;
                                ConversationService.sendMessage({ text: fetchMessage }, afterResponse.context, success);
                            } else {
                                success(afterResponse);
                            }
                        });
                    }
                );
            });
        }
    };
})();

module.exports = ConversationService;
