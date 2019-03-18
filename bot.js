const { ActivityTypes, MessageFactory, TurnContext   } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const axios = require('axios');
const { DialogSet, WaterfallDialog, TextPrompt, NumberPrompt, ChoicePrompt, DialogTurnStatus} = require('botbuilder-dialogs')
const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_PROFILE_PROPERTY = 'user';
const MAIN_DIALOG = 'Main_Dialog';
const CHITCHAT_DIALOG = 'Chitchat_Dialog';
const TEXT = 'Text';
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}
const path = require('path');
const storage = require('azure-storage');
const blobService = storage.createBlobService();



class BasicBot {
    constructor(conversationState, userState, luisApplication, luisPredictionOptions){
        this.userState = userState;
        this.conversationState = conversationState;
        this.conversationReference = this.conversationState.createProperty('CONVERSATION_REFERENCE');
        // this.luisRecognizer = new LuisRecognizer(luisApplication, luisPredictionOptions, true);
        this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);
        this.userProfile = this.userState.createProperty(USER_PROFILE_PROPERTY);
        this.dialogs = new DialogSet(this.dialogState);
        this.dialogs.add(new TextPrompt(TEXT));
        this.dialogs.add(new WaterfallDialog(MAIN_DIALOG, [
            this.call_fun_1.bind(this),
            this.call_fun_2.bind(this),
            this.call_fun_3.bind(this)
        ]));
        this.dialogs.add(new WaterfallDialog(CHITCHAT_DIALOG, [
            this.call_fun_1.bind(this),
            this.call_fun_2.bind(this),
            this.call_fun_3.bind(this)
        ]));
    }
    async onTurn(turnContext) {
        
        // const lresults = await this.luisRecognizer.recognize(turnContext);
        // const topIntent = lresults.luisResult.topScoringIntent;
        
        if (turnContext.activity.type === ActivityTypes.Message) {
            if (turnContext.activity.attachments && turnContext.activity.attachments.length > 0) {
                // The user sent an attachment and the bot should handle the incoming attachment.
                await this.handleIncomingAttachment(turnContext);
            } 


            const text = turnContext.activity.text;
            console.log(turnContext);
            // if (turnContext.activity.channelId === 'facebook') {
            //     processFacebookPayload(turnContext.activity.channelData);
            
                // console.log(topIntent.intent)
                // console.log(topIntent)
                // moved create context inside a switch case to test posible conflicts
            
                // if(results.status===DialogTurnStatus.waiting){  
                //     // skip while waiting intent
                // } 
                // else {
                        
                    
                        // let text = topIntent.intent;
                        switch (text) {
                            case 'getBack':
                                await turnContext.sendActivity(`Can do! I'll be kind and rewind our chat`);
                                return await dc.replaceDialog(MAIN_DIALOG);
                        
                            case 'getBotInfo':

                                await turnContext.sendActivity(`I collect uplifting moments shared by people all over the world. Every week, I put the together in a video like this`);
                                await timeout(1500);
                                await turnContext.sendActivity(`Want in? I'll tell you how`);
                                const dc = await this.dialogs.createContext(turnContext);
                                const results = await dc.continueDialog();
                                console.log(results.status)
                                break;
                            case 'getChitChat':
                                await this.sendChitChatMessages(turnContext);
                                break;
                            case 'getContinue':
                                await turnContext.sendActivity('Great, I will keep going');
                                // await dc.beginDialog(MAIN_DIALOG);
                                break;
                            case 'getFinish_Conversation':
                                await turnContext.sendActivity(`Okey, we'll call it a day. Till next time!`);
                                await dc.endDialog(MAIN_DIALOG);
                                break;
                            case 'getGreeting_daily':
                                await this.sendGreeting_dailyMessages(turnContext);
                                break;
                            case 'getGreeting_Inchat':
                                await this.sendGreeting_InchatMessages(turnContext);
                                break;
                            case 'getNotNow':
                                await this.sendNotNowMessages(turnContext);
                                break;
                            case 'getPrompt':
                                await this.sendPromptMessages(turnContext);
                                break;
                            case 'getStarted':
                                await this.sendStartMessages(turnContext);
                                break;
                            case 'getVideo_LastWeek':
                                await this.sendVideo_LastWeekMessages(turnContext);
                                break;
                            case 'getVideo_ThisWeek':
                                await this.sendVideo_ThisWeekMessages(turnContext);
                                break;
                            default :
                                
                                    // await turnContext.sendActivity(`Come again? I didn't understand that`);
                                    var reply = MessageFactory.suggestedActions(['getBack', 'getBotInfo', 'getChitChat', 'getContinue'],`Come again?, I didn't understand that.`);
                                    await turnContext.sendActivity(reply);
                                    // await this.sendDefaultMessages(turnContext);
                                
                        }
                    
                // }
                    // if (!turnContext.responded) {
                    //     await turnContext.sendActivity('...');
                    //     await dc.beginDialog(MAIN_DIALOG);
                    // } 
            // }  // end of facebook channel data 
            // const utterance = (turnContext.activity.text || '').trim().toLowerCase();

            
        } else if(turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            await this.storeConversationReference(turnContext);
            if (turnContext.activity.membersAdded && turnContext.activity.membersAdded.length > 0) {
                await this.sendWelcomeMessage(turnContext);
            }
        } else {
            await turnContext.sendActivity(`[${ turnContext.activity.type } event detected.]`);
            if (turnContext.activity.channelId === 'facebook') {
                // Analyze Facebook payload from channel data to trigger custom events.
                processFacebookPayload(turnContext.activity.channelData);
            }
        }
        // console.log(turnContext.activity.recipient.id);
        await this.userState.saveChanges(turnContext);
        await this.conversationState.saveChanges(turnContext);
    }

    async localDownloadAttachment(attachment){
        let url = attachment.contentUrl;
            let dir_local = __dirname + '/files';
            const localFileName = path.join(dir_local, attachment.name);

            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                if (response.headers['content-type'] === 'application/json') {
                    response.data = JSON.parse(response.data, (key, value)=> {
                        return value && value.type === 'Buffer' ?
                        Buffer.from(value.data): 
                        value;
                    });
                } 
                fs.writeFile(localFileName, response.data, (fsError)=> {
                    if(fsError){
                        throw fsError;
                    }
                });
            } catch (error){
                console.error(error);
                return undefined;
            }
            return {
                localFileName: attachment.name,
                localPath: localFilename
            };
    }

    async handleIncomingAttachment(turnContext) {
        const promises = turnContext.activity.attachments.map((attachment)=>{this.downloadAttachmentAndWrite(attachment,turnContext)});
        await Promise.all(promises);
    }
    
    async downloadAttachmentAndWrite(attachment,turnContext) {
        const reference = await this.conversationReference.get(turnContext);
        if (reference) { console.log('here is the reference object:   ' + reference) }
        
        if(reference.channelId===emulator){
            result = localDownloadAttachment(attachment);
            console.log(result);
            
        } else if(reference.channelId===facebook){
            let obj_filename = attachment.name + reference.user.id + '__' + Date.now() 
            let obj_url = 'https://amp.businessinsider.com/images/58584681a1a45e46008b6dcd-750-563.png';
            let containerName = 'ojoy-storage';
            //set conversation reference in blob metadata
            var options = { metadata: { "conversation_reference": JSON.stringify(reference) } };
            //get file buffer stream
            const response = await axios.get(obj_url, { responseType: 'stream' });
            //get file content length
            let size = response.headers['content-length'];
            
                return new Promise((resolve, reject) => {
                    blobService.createBlockBlobFromStream(containerName, obj_filename, response.data, size, options, err => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });  
        }
    }
    async storeConversationReference(turnContext) {
        // pull the reference
        const reference = TurnContext.getConversationReference(turnContext.activity);
        // store reference in memory using conversation data property
        await this.conversationReference.set(turnContext, reference);
    }

    async sendWelcomeMessage(turnContext) {
        for (var idx in turnContext.activity.membersAdded) {
            if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                await turnContext.sendActivity(`I’m a bot that serves up feel-good moments. Ever wonder how your idea of Love compares to everyone else's?`);
                await timeout(2500);
                await turnContext.sendActivity(`Watch this to see what I mean`)  
                await timeout(1500);
                await turnContext.sendActivity(`Video`)
                await timeout(2500);
                if (turnContext.activity.channelId === 'facebook') {
                    processFacebookPayload(turnContext.activity.channelData);
                    var reply = MessageFactory.suggestedActions(['getBotInfo'], '');
                    await turnContext.sendActivity(reply);       
                } // end of processFacebookPayload
            }
        }
    }

    async sendChitChatMessages(turnContext) {
        let url = "https://api.chucknorris.io/jokes/random";
        let res = await axios.get(url);
        await turnContext.sendActivity(res.data.value);
        await this.sendDefaultMessages(turnContext);
    }

    async sendDefaultMessages(turnContext){
            // var reply = MessageFactory.suggestedActions(['getBack', 'getBotInfo', 'getChitChat', 'getContinue'],``);
            // await turnContext.sendActivity(reply);
    }

    async call_fun_1(step){
        await step.context.sendActivity('step 1');
        return await step.prompt(TEXT, '');
    }
    async call_fun_2(step){
        await step.context.sendActivity('step 2');
        return await step.prompt(TEXT, '');
        // await step.context.sendActivity(step.result);
        // var reply = MessageFactory.suggestedActions(['BACK', 'NOT_NOW'], '');
        // await step.context.sendActivity(reply);
        // return reply;
    }
    async call_fun_3(step){
        await step.context.sendActivity('step 3');
        return await step.prompt(TEXT, '');
        // if(step.result==='BACK'){
        //     return await step.replaceDialog(MAIN_DIALOG);
        // } else {
        //     await step.context.sendActivity(step.result);
        // }
    }
}
module.exports.BasicBot = BasicBot;

function processFacebookPayload(channelData) {
    if (!channelData) {
        return;
    }

    if (channelData.postback) {
        onFacebookPostback(channelData.postback);
    } else if (channelData.optin) {
        onFacebookOptin(channelData.optin);
    } else if (channelData.message && channelData.message.quick_reply) {
        onFacebookQuickReply(channelData.message.quick_reply);
    } else {
        // TODO: Handle other events that you're interested in...
    }
}
function onFacebookOptin(optin) {
    // TODO: Your optin handling logic here...
}

function onFacebookPostback(postback) {
    // TODO: Your postBack handling logic here...
}

function onFacebookQuickReply(quickReply) {
    // TODO: Your QuickReply handling logic here...
    
}

