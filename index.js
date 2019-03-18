// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// index.js is used to setup and configure your bot

// Import required pckages
const path = require('path');
const restify = require('restify');
const axios = require('axios');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const storage = require('azure-storage');
const blobService = storage.createBlobService();

// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState, ActivityTypes, TurnContext } = require('botbuilder');
// Import required bot configuration.
const { BotConfiguration } = require('botframework-config');

// This bot's main dialog.
const { BasicBot } = require('./bot');

// Read botFilePath and botFileSecret from .env file
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '.env');
const env = require('dotenv').config({ path: ENV_FILE });

// Get the .bot file path
// See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.
const BOT_FILE = path.join(__dirname, (process.env.botFilePath || ''));
let botConfig;
try {
    // Read bot configuration from .bot file.
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - You can find the botFilePath and botFileSecret in the Azure App Service application settings.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.`);
    console.error(`\n - See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.\n\n`);
    process.exit();
}

// For local development configuration as defined in .bot file
const DEV_ENVIRONMENT = 'development';

// bot name as defined in .bot file or from runtime
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);

// Get bot endpoint configuration by service name
const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

// Create adapter. 
// See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration .
const adapter = new BotFrameworkAdapter({
    appId: endpointConfig.appId || process.env.microsoftAppID,
    appPassword: endpointConfig.appPassword || process.env.microsoftAppPassword,
    channelService: process.env.ChannelService,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
    // Clear out state
    await conversationState.clear(context);
    // Save state changes.
    await conversationState.saveChanges(context);
};

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.
let conversationState, userState;

let reference = 'reference';
// CosmosDB storage
// Create access to Cosmos DB storage.
//Add CosmosDB 
const { CosmosDbStorage } = require("botbuilder-azure");
const memoryStorage = new CosmosDbStorage({
    serviceEndpoint: process.env.ACTUAL_SERVICE_ENDPOINT, 
    authKey: process.env.ACTUAL_AUTH_KEY, 
    databaseId: process.env.DATABASE,
    collectionId: process.env.COLLECTION
})


// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
//const memoryStorage = new MemoryStorage();
conversationState = new ConversationState(memoryStorage);
userState = new UserState(memoryStorage);


// console.log('userState-----userState')
// console.log(userState)

// CAUTION: You must ensure your product environment has the NODE_ENV set
//          to use the Azure Blob storage or Azure Cosmos DB providers.

// Add botbuilder-azure when using any Azure services. 
// const { BlobStorage } = require('botbuilder-azure');
// // Get service configuration
// const blobStorageConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID);
// const blobStorage = new BlobStorage({
//     containerName: (blobStorageConfig.container || DEFAULT_BOT_CONTAINER),
//     storageAccountOrConnectionString: blobStorageConfig.connectionString,
// });
// conversationState = new ConversationState(blobStorage);
// userState = new UserState(blobStorage);

// Create the main dialog.

const LUIS_CONFIGURATION = 'BasicBotLuisApplication';

const luisConfig = botConfig.findServiceByNameOrId(LUIS_CONFIGURATION);

const luisApplication = {
    applicationId: luisConfig.appId,
    endpointKey: luisConfig.authoringKey,
    endpoint: luisConfig.getEndpoint()
};

// Create configuration for LuisRecognizer's runtime behavior.
const luisPredictionOptions = {
    includeAllIntents: true,
    log: true,
    staging: false
};

let bot;
try {
    bot = new BasicBot(conversationState, userState, luisApplication, luisPredictionOptions);
} catch (err) {
    console.error(`[botInitializationError]: ${ err }`);
    process.exit();
}


// Create HTTP server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
    console.log(`\nTo talk to your bot, open basic-bot.bot file in the Emulator`);
});



server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (turnContext) => {
        await bot.onTurn(turnContext);
        if (turnContext.activity.type === "message") {
            reference = TurnContext.getConversationReference(turnContext.activity);
        }
    });
    
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());


///   ffmpeg needs to call this endpoint to give the user the url his needs to open (demo through postman)
server.post('/api/ffmpeg/test2', async (req, res, next) => {
    try 
    {
        // res.send(req.body);
        const obj = req.body;
        const oref = obj.reference;
 
        if (oref) {
            // await adapter.continueConversation(oref, async (context) => {
            //     const message = 'Use this link to open the video:' +  obj.url;
            //     await context.sendActivity(message);
            //     console.log(message);
            // });

            //try posting to Facebook API via Send API
            let facebook_url = 'https://graph.facebook.com/v2.6/me/messages?access_token=EAAfMMp4oE0EBAJnHNtZCmWUDJv1JmXBD4g5NqdKLVW1b3GOScpybBKNImcONt0DeBEIdV5ZBTRVxN7U94EeYgSbjQQNXVK6MqY0GfqGw5vqL7tb04JZB59YlAyKeGVmZCaUnfPVYaZAeXLnlOiQZAI2WpCtxZCqRZA96kbDwc9tOvuMZAnHfB6zzD';
            let post_obj = {
                "recipient": { 
                  "id": "2125277244228962"
                },
                "message":{
                  "text":"Here is the url to your video: "+obj.url
                },
                "messaging_type": "MESSAGE_TAG",
                "tag": "BUSINESS_PRODUCTIVITY"
              };

             axios.post(facebook_url, post_obj).then(function (response) {
                console.log(response);
                res.send({ message: "facebook message sent!"});
              })
              .catch(function (error) {
                console.log(error);
              });

        };
    } catch(err) {
        console.log('error?');
        res.send({message: err.message});
        console.log(err);
    }
});

    


///  this endpoint posts the image to blob storage  (first step demo through facebook window)
 server.get('/api/uploadimage', async (req, res) => {
    console.log('here---index')
    if (reference) {
       await adapter.continueConversation(reference, async (context) => {
         const text = JSON.stringify(reference);

          const url = 'https://www.thelocal.fr/userdata/images/article/1e65a7b8481966489a47d4c3e2f8ac1a1ba04541731568ec8cb997f80fa0d246.jpg';
        // console.log(url)
        let containerName = 'ojoy-storage';
        const response = await axios.get(url, { responseType: 'stream' });
        // console.log(response);
        let size = response.headers['content-length']
        console.log(size)

        //set conversation reference in blob metadata
        var metav = { metadata: { "conversation_reference": JSON.stringify(reference) } };
        
        return new Promise( function(resolve, reject){
            let filename_img = 'image_' + reference.user.id + '__' + Date.now()  +  '.jpg';
            blobService.createBlockBlobFromStream(containerName, filename_img, response.data, size, metav, function(error){
                if(!error){
                    // Blob uploaded
                    resolve('file uploaded');
                } else {
                    reject(error);
                }
            });

        
            // let filename_txt = 'reference_' + reference.user.id + '__' + Date.now() +  '.txt';
            // blobService.createBlockBlobFromText(containerName, filename_txt, text,  function(error){

            //     if(!error){
            //         // Blob uploaded
            //         resolve({ message: `Text "${text}" is written to blob storage` });
            //     } else {
            //         reject(error);
            //     }
            // });
        })  
       });
       res.send(200);
    } else {
       res.send(404);
    }
 });