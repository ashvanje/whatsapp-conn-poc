import { create, Client, decryptMedia, Message } from "@open-wa/wa-automate"
import mime from "mime-types"
import fetch from "node-fetch"
import bent from "bent"
import { spawn } from "child_process"
import Brainly from "brainly-scraper-ts"
const express = require('express')
const googleAuth = require('google-oauth-jwt')
const axios = require('axios')


var mongoose = require("mongoose");
var mongoConnection: any;
var viewSchema = new mongoose.Schema({}, { strict: false });
var viewModel = mongoose.model("View", viewSchema);

function generateAccessToken(email: any, key: any) {
  return new Promise((resolve) => {
    googleAuth.authenticate(
      {
        email: email,
        key: key.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      },
      (err: any, token: any) => {
        resolve(token)
      },
    )
  })
}

// WORKED FOR CITYBUS
// async function sendMessage(userText: any, sessionId: any) {

//   let email = 'dialogflow-bmwdcn@nextmtr-cqpc.iam.gserviceaccount.com'
//   let key = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCvcAQWdM/JT1cK\n4cxDfGR1LFgpB3/eXAKuA2t6Zvmd2pc+Ieq5vu5ZmkWrn626U9zpYy0Zv0FeeJrR\nB/h5hX/l4EslvzwGt+6If7Vl6LuPt9HWgJWAynYC1Tfjs9Oj4XBDz4JK0IPH8Aho\nSydZdCOHcwIE9eXm5Zuy7sr2rZPRuL72dP1Nj5Z2Ei4LX3mzJtKpV2cxubm2VUqD\n4COF+TQjgtLaXWrCHESntzu83SKQjqZ7xdpR4TmBmwcNsJ7YjrBoGT4MOAan1Za7\n6dW11WbdYVqe8uFJs0GSMCwnipAuqoyoeLRE5zK//XHxiSVS8au7o5rXlFQ69ev6\nZXNQiA13AgMBAAECggEARrza2RcmhRw5k4ix7PAmLVzA+2Iru8PLzNBSMNt+gJiX\n7RSN6XFD99sNhoLu8LdJ1s0HbV9Bg08L1YbqOE2M4WqLwl+WW3skceNUiA/MOMm8\nkUntfi2kYcYJMAXdKzIGK0FrXrEuwZpWOX88EYSTotTLlqZzmaMxIXfJXKdmd+Pi\nOeL9R/I5S4k9k3EtslIfTTs2rajwdmd/ANDHWBFG+1uqh+7NLMRNAiAl+x/AGdVU\naqg0g1UPG2bVYQis4hQrMlkvC+uJfZXVseZIoHEnyAB87fnB/j3h80dOvJLKOtzX\nVHjRphzuRjeed5p+tcWygl8Batj1gY7hoZp1XC1VWQKBgQD2cX6fpTydSKpzNiJX\nSXR1JsC75D+IPJX0cA74Ss4zksos62BU375RHVztdp5ZhCok90hoqDMKPibOPnBr\nbMY8kNV2NOJ+we4KuAcNrcUvM6YhOhKwYXimddiUyffBoqan3hrInJUpq5NCWPf+\nCjVXhWaUB9kWPpEr7vu+85ejbQKBgQC2PaEIvCP0xZDzRvJkSPkecGs/09TUwpIq\n9Dou2xkH5wr+2h4tjkM8DKlqTuijqFU3VpVNqt3QtMXQjQFO+bpkkWINGSM8zojM\nLhYLSW3UFKSr8p70J6zuAfM5vmrRSEIRcEJeBchePmSeVcKlNpOoJ+ytlplNZ2Q5\nppnQgnaB8wKBgQCgt9uQWb5yBJXElSVIL4tXa3J+FpioTHqu8vWQT5iyYaSgLtCg\nCVqgo7ma06TpVBv4B5ydRDQlFetQzb+bD1Eo5nuPn2WmrOqE6wcOkKjr448QVEMj\n7C02wdwBDMYa7ewpxdtJwXQ1vMNInaT9c8Ld1Q3UtFmK/DrIoA5ltY7K8QKBgDBJ\nkiKzXz+bHbYoRU+nOkMDfJdz9H/PclVpUwVZTn+Wi4ZNmxNtD4mYvUcK03+Rucqo\n6XSj4pRLYeLJieA4MVg2YWmhEIIrI3oed/7TnQNF2QAqkE2XOa3y3FSfjMQZRlBC\nk4NAOwAlvhlqFeIa3PMAaSjxr3sf+yF/cGAcQXRbAoGBAL2zeeuIARjmlKprGES/\nSVcXMXlN5lOgamSUzBtnRB45NAhvCY7RYKADcq66Ginnw2PeaygaAFRGhIz0fxNI\nIUi8zZtwh/BggNcqQ86XLrBldD42kUhds9jrYBWiM/Rv2XCmUHBiadH/P5qXFSms\nvgAs1GI+5EytOxPL/BlYLJOF\n-----END PRIVATE KEY-----\n'
//   let url = 'https://dialogflow.googleapis.com/v2/'
//   let path = 'projects/nextmtr-cqpc/agent/sessions/'
//   let sid = 'abcdefg'

//   console.log('!!!!!!!!!!!!!1')
//   let accessToken = await generateAccessToken(email, key)
//   // let accessToken = 'ya29.a0AfH6SMBkS1Z-Q1Jg0iQFgdp0BHRragc3qCGutQayiSoj1XuLeGNC-SYsJbgRyrGO4UFngqQkggIYiIFC3CGaHv--JYTodTKIjhWPr8-j53mLoqKrbOhPP_5wUEomvgaUpHOeV7eTCaTZwLZIUm6ctICB4vDMZz0OkAVTcFzaP2A'
//   console.log('!!!!!!!!!!!!!2' + accessToken)

//   console.log(`${url}${path}${sessionId}:detectIntent`)

//   let data;

//   data = {
//     queryInput: {
//       text: {
//         text: userText,
//         languageCode: "en"
//       }
//     }
//   }

//   //https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent
//   let response = await axios.post(`${url}${path}${sessionId}:detectIntent`, data, {
//     // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
//     content: JSON,
//     content_type: 'application/json',
//     expect_type: 'text/plain',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${accessToken}`
//     }
//   })
//   console.log(`response = ${JSON.stringify(response.data)}`)
//   console.log(`response = ${JSON.stringify(response.data.queryResult.fulfillmentMessages)}`)

//   let dialogFlowFulfillmentMessage = `${response.data.queryResult.fulfillmentMessages[0].text.text[0]}`
//   let returnMessage = ''
//   console.log(`response.data.queryResult.intent.displayName: ${response.data.queryResult.intent.displayName}`)
//   console.log(`dialogFlowFulfillmentMessage: ${dialogFlowFulfillmentMessage}`)
//   if (response.data.queryResult.intent.displayName == 'askRouteStop') {
//     console.log(`askRouteStop`)
//     if (dialogFlowFulfillmentMessage.includes("biz")) {
//       console.log(`askRouteStop 1`)
//       returnMessage = await sendMessage('askDirection', sessionId)
//     } else {
//       console.log(`askRouteStop 2`)
//       returnMessage = dialogFlowFulfillmentMessage
//     }
//   } else if (response.data.queryResult.intent.displayName == 'askDirection') {
//     console.log(`askDirection`)
//     if (dialogFlowFulfillmentMessage.includes("biz")) {
//       console.log(`askDirection 1`)
//       returnMessage = await sendMessage('askStop', sessionId)
//     } else {
//       console.log(`askDirection 2`)
//       returnMessage = dialogFlowFulfillmentMessage
//     }

//   } else if (response.data.queryResult.intent.displayName == 'askStop') {
//     console.log(`askStop`)
//     if (dialogFlowFulfillmentMessage.includes("biz")) {
//       let param: any
//       console.log(`dialogFlowFulfillmentMessage = ${JSON.stringify(dialogFlowFulfillmentMessage)}`)
//       console.log(`response.data.queryResult.outputContexts = ${JSON.stringify(response.data.queryResult.outputContexts)}`)

//       response.data.queryResult.outputContexts.forEach((outputContext: { name: { include: (arg0: string) => any } }) => {
//         console.log(`outputContext = ${JSON.stringify(outputContext)}`)
//         let outputContextName = `${outputContext.name}`
//         console.log(`outputContextName = ${JSON.stringify(outputContextName)}`)
//         if (outputContextName.includes('testfollowupintent-followup')) {
//           param = outputContext
//           console.log(`param = ${JSON.stringify(param)}`)

//         }
//       });
//       console.log(`param2 = ${JSON.stringify(param)}`)
//       // let params = outputContexts

//       let data;
//       let stop = parseInt(param.parameters.stop,10)
//       data = { "company": "Citybus", "route": param.parameters.route, "boundFor": "outbound", "startStop": stop-1, "endStop": stop }

//       //https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent
//       let etaResponse = await axios.post(`http://whenarrive.com/getEta`, data, {
//         // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
//         content: JSON,
//         content_type: 'application/json',
//         expect_type: 'text/plain',
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       })
//       console.log(`etaResponse.data = ${JSON.stringify(etaResponse.data)}`)

//       returnMessage = `data: ${JSON.stringify(etaResponse.data)} stop: ${param.parameters.stop} direction: ${param.parameters.direction} route: ${param.parameters.route}`
//       console.log(`askStop 1`)
//       // returnMessage= await sendMessage('askStop', sessionId)
//     } else {
//       console.log(`askStop 2`)
//       returnMessage = dialogFlowFulfillmentMessage
//     }

//   }

//   // console.log(`@@@@@@@@`)
//   return returnMessage
// }

async function sendMessage(userText: any, sessionId: any) {
  
  let email = 'dialogflow-bmwdcn@nextmtr-cqpc.iam.gserviceaccount.com'
  let key = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCvcAQWdM/JT1cK\n4cxDfGR1LFgpB3/eXAKuA2t6Zvmd2pc+Ieq5vu5ZmkWrn626U9zpYy0Zv0FeeJrR\nB/h5hX/l4EslvzwGt+6If7Vl6LuPt9HWgJWAynYC1Tfjs9Oj4XBDz4JK0IPH8Aho\nSydZdCOHcwIE9eXm5Zuy7sr2rZPRuL72dP1Nj5Z2Ei4LX3mzJtKpV2cxubm2VUqD\n4COF+TQjgtLaXWrCHESntzu83SKQjqZ7xdpR4TmBmwcNsJ7YjrBoGT4MOAan1Za7\n6dW11WbdYVqe8uFJs0GSMCwnipAuqoyoeLRE5zK//XHxiSVS8au7o5rXlFQ69ev6\nZXNQiA13AgMBAAECggEARrza2RcmhRw5k4ix7PAmLVzA+2Iru8PLzNBSMNt+gJiX\n7RSN6XFD99sNhoLu8LdJ1s0HbV9Bg08L1YbqOE2M4WqLwl+WW3skceNUiA/MOMm8\nkUntfi2kYcYJMAXdKzIGK0FrXrEuwZpWOX88EYSTotTLlqZzmaMxIXfJXKdmd+Pi\nOeL9R/I5S4k9k3EtslIfTTs2rajwdmd/ANDHWBFG+1uqh+7NLMRNAiAl+x/AGdVU\naqg0g1UPG2bVYQis4hQrMlkvC+uJfZXVseZIoHEnyAB87fnB/j3h80dOvJLKOtzX\nVHjRphzuRjeed5p+tcWygl8Batj1gY7hoZp1XC1VWQKBgQD2cX6fpTydSKpzNiJX\nSXR1JsC75D+IPJX0cA74Ss4zksos62BU375RHVztdp5ZhCok90hoqDMKPibOPnBr\nbMY8kNV2NOJ+we4KuAcNrcUvM6YhOhKwYXimddiUyffBoqan3hrInJUpq5NCWPf+\nCjVXhWaUB9kWPpEr7vu+85ejbQKBgQC2PaEIvCP0xZDzRvJkSPkecGs/09TUwpIq\n9Dou2xkH5wr+2h4tjkM8DKlqTuijqFU3VpVNqt3QtMXQjQFO+bpkkWINGSM8zojM\nLhYLSW3UFKSr8p70J6zuAfM5vmrRSEIRcEJeBchePmSeVcKlNpOoJ+ytlplNZ2Q5\nppnQgnaB8wKBgQCgt9uQWb5yBJXElSVIL4tXa3J+FpioTHqu8vWQT5iyYaSgLtCg\nCVqgo7ma06TpVBv4B5ydRDQlFetQzb+bD1Eo5nuPn2WmrOqE6wcOkKjr448QVEMj\n7C02wdwBDMYa7ewpxdtJwXQ1vMNInaT9c8Ld1Q3UtFmK/DrIoA5ltY7K8QKBgDBJ\nkiKzXz+bHbYoRU+nOkMDfJdz9H/PclVpUwVZTn+Wi4ZNmxNtD4mYvUcK03+Rucqo\n6XSj4pRLYeLJieA4MVg2YWmhEIIrI3oed/7TnQNF2QAqkE2XOa3y3FSfjMQZRlBC\nk4NAOwAlvhlqFeIa3PMAaSjxr3sf+yF/cGAcQXRbAoGBAL2zeeuIARjmlKprGES/\nSVcXMXlN5lOgamSUzBtnRB45NAhvCY7RYKADcq66Ginnw2PeaygaAFRGhIz0fxNI\nIUi8zZtwh/BggNcqQ86XLrBldD42kUhds9jrYBWiM/Rv2XCmUHBiadH/P5qXFSms\nvgAs1GI+5EytOxPL/BlYLJOF\n-----END PRIVATE KEY-----\n'
  let url = 'https://dialogflow.googleapis.com/v2/'
  let path = 'projects/nextmtr-cqpc/agent/sessions/'
  let sid = 'abcdefg'
  let stops = await mtrStops()
  console.log(`stops = ${JSON.stringify(stops.data)}`)
  console.log('!!!!!!!!!!!!!1')
  let accessToken = await generateAccessToken(email, key)
  // let accessToken = 'ya29.a0AfH6SMBkS1Z-Q1Jg0iQFgdp0BHRragc3qCGutQayiSoj1XuLeGNC-SYsJbgRyrGO4UFngqQkggIYiIFC3CGaHv--JYTodTKIjhWPr8-j53mLoqKrbOhPP_5wUEomvgaUpHOeV7eTCaTZwLZIUm6ctICB4vDMZz0OkAVTcFzaP2A'
  console.log('!!!!!!!!!!!!!2' + accessToken)

  console.log(`${url}${path}${sessionId}:detectIntent`)

  let data;

  data = {
    queryInput: {
      text: {
        text: userText,
        languageCode: "en"
      }
    }
  }

  //https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent
  let response = await axios.post(`${url}${path}${sessionId}:detectIntent`, data, {
    // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
    content: JSON,
    content_type: 'application/json',
    expect_type: 'text/plain',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  })
  console.log(`response = ${JSON.stringify(response.data)}`)
  console.log(`response = ${JSON.stringify(response.data.queryResult.fulfillmentMessages)}`)

  let dialogFlowFulfillmentMessage = `${response.data.queryResult.fulfillmentMessages[0].text.text[0]}`
  let returnMessage = ''
  console.log(`response.data.queryResult.intent.displayName: ${response.data.queryResult.intent.displayName}`)
  console.log(`dialogFlowFulfillmentMessage: ${dialogFlowFulfillmentMessage}`)
  if (response.data.queryResult.intent.displayName == 'askRouteStop') {
    console.log(`askRouteStop`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`askRouteStop 1`)
      returnMessage = await sendMessage('askDirection', sessionId)
    } else {
      console.log(`askRouteStop 2`)
      let routes = await getRoutes()
      console.log(`routes: ${JSON.stringify(routes.data)}`)
      returnMessage = dialogFlowFulfillmentMessage + JSON.stringify(routes.data)
    }
  } else if (response.data.queryResult.intent.displayName == 'askDirection') {
    console.log(`askDirection`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      console.log(`askDirection 1`)
      returnMessage = await sendMessage('askStop', sessionId)
    } else {
      console.log(`askDirection 2`)
      let direction = await inoutboundstops()
      console.log(`direction: ${JSON.stringify(direction.data)}`)
      returnMessage = dialogFlowFulfillmentMessage + JSON.stringify(direction.data)
    }

  } else if (response.data.queryResult.intent.displayName == 'askStop') {
    console.log(`askStop`)
    if (dialogFlowFulfillmentMessage.includes("biz")) {
      let param: any
      console.log(`dialogFlowFulfillmentMessage = ${JSON.stringify(dialogFlowFulfillmentMessage)}`)
      console.log(`response.data.queryResult.outputContexts = ${JSON.stringify(response.data.queryResult.outputContexts)}`)

      response.data.queryResult.outputContexts.forEach((outputContext: { name: { include: (arg0: string) => any } }) => {
        console.log(`outputContext = ${JSON.stringify(outputContext)}`)
        let outputContextName = `${outputContext.name}`
        console.log(`outputContextName = ${JSON.stringify(outputContextName)}`)
        if (outputContextName.includes('testfollowupintent-followup')) {
          param = outputContext
          console.log(`param = ${JSON.stringify(param)}`)

        }
      });
      console.log(`param2 = ${JSON.stringify(param)}`)
      // let params = outputContexts
      let eta = await getEta()
      
      returnMessage = `data: ${JSON.stringify(eta.data)} stop: ${param.parameters.stop} direction: ${param.parameters.direction} route: ${param.parameters.route}`
      console.log(`askStop 1`)
      // returnMessage= await sendMessage('askStop', sessionId)
    } else {
      console.log(`askStop 2`)
      let stops = await mtrStops()
      console.log(`stops: ${JSON.stringify(stops.data)}`)
      returnMessage = dialogFlowFulfillmentMessage + JSON.stringify(stops.data)
    }

  }

  // console.log(`@@@@@@@@`)
  return returnMessage
}

async function getRoutes () {
  return await axios.get(`http://whenarrive.com/getRoutes?company=MTR`, {
    // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
    content: JSON,
    content_type: 'application/json',
    expect_type: 'text/plain',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

async function inoutboundstops () {
  let data = {"company":"MTR","route":"TCL"}
  return await axios.post(`http://whenarrive.com/inoutboundstops`, data, {
    // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
    content: JSON,
    content_type: 'application/json',
    expect_type: 'text/plain',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}


async function mtrStops () {
  return await axios.get(`http://whenarrive.com/mtrStops?route=TCL&bound=up`, {
    "headers": {
      'Connection': 'keep-alive', 
      'Accept': 'application/json, text/plain, */*', 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36', 
      'Content-Type': 'application/json', 
      'Referer': 'http://whenarrive.com/', 
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })
}

async function getEta () {
  let data = {"company":"MTR","boundFor":"up","stationCode":"LAK","line":"TCL","station":"Lai King"}
  return await axios.post(`http://whenarrive.com/getEta`, data, {
    content: JSON,
    content_type: 'application/json',
    expect_type: 'text/plain',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

async function connectMongo() {
  if (mongoConnection == null) {
    mongoConnection = await mongoose.connect("mongodb+srv://admin:dbUserPassword@cluster0-fjcyn.mongodb.net/test?retryWrites=true&w=majority");
    console.log(`first connection to mongo`)
  } else {
    console.log(`connection to mongo already exists`)
  }
}

async function saveViewToDB(req: any) {
  await connectMongo();
  let body = req
  var data = body
  // console.log(`before saving to DB: ${JSON.stringify(req)}`)
  var callback = function (err: any, data: any) {
    // if(err)
    // console.log(err);
    // else
    // console.log(data);
  }
  mongoose.Promise = global.Promise;
  var testPayment = new viewModel(data);
  var saveResult = await testPayment.save(callback);

  return saveResult;
}

function checkRemainingQuotaForNumber(from: String) {
  console.log(`checking remaining quota for ${from}...`)
  return true
}

function start(client: Client) {
  // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
  client.onMessage(async (message: Message) => {
    client.reply("85297306934@c.us", "message from " + message.from, "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")
    // client.reply("85260714187@c.us", "this is not a marketing message", "85297306934@c.us")

    await saveViewToDB(message)
    // console.log("onMessage..." + message.body)
    // console.log("onMessage..." + message.mimetype)
    // console.log("...")
    // console.log(JSON.stringify(message))
    // console.log("...")

    if (message.mimetype === "image/jpeg") {
      console.log("Loading...")
      const filename: string = `${message.t}.${mime.extension(
        message.mimetype
      )}`

      try {
        console.log("Decrypting...")
        const mediaData = await decryptMedia(message)
        const imageBase64: string = `data:${message.mimetype
          };base64,${mediaData.toString("base64")}`

        client.sendImageAsSticker(message.from, imageBase64)
        console.log("sticker sent!")
      } catch (err) {
        throw new Error(err.message)
      }
    } else {
      const isEligible = checkRemainingQuotaForNumber(message.from)
      if (isEligible) {

      }
      // const content = `Please send us a photo to turn it into a sticker!

      console.log(`before sendMessageResponse`)
      const sendMessageResponse = await sendMessage(message.body, message.from)
      console.log(`sendMessageResponse: ${sendMessageResponse}`)
      let content = ''
      //Support us by forwarding this Robot to your friends: https://wa.me/85260714187?text=I'm%20referred%20by%${message.from}`
      // if (sendMessageResponse.hasOwnProperty('card')) {
      //   content = `${JSON.stringify(sendMessageResponse.card.buttons)}`
      //   console.log(`1: ${content}`)
      // } else if (sendMessageResponse.hasOwnProperty('quickReplies')) {
      //   content = `${JSON.stringify(sendMessageResponse.quickReplies.quickReplies)}`
      //   console.log(`2: ${content}`)
      // } else {
      content = sendMessageResponse
      console.log(`3: ${content}`)
      // }
      console.log(`message.from: ${message.from}`)
      // console.log(`content: ${JSON.stringify(content)}`)
      // console.log(`content: ${content.text.text}`)
      console.log(`message.chatId: ${message.chatId}`)
      // const replyMsg = content
      // console.log(`replyMsg: ${JSON.stringify(content)}`)
      client.reply(message.from, `${content}`, message.chatId)
      console.log("Sent!")
    }

    //     if (message.body.includes("/sticker")) {
    //       const isEligible = checkRemainingQuotaForNumber(message.from)
    //       if (isEligible) {

    //       }
    //       const content = `https://wa.me/85260714187?text=I'm%20referred%20by%${message.from}`

    //       console.log(`message.from: ${message.from}`)
    //       console.log(`content: ${content}`)
    //       console.log(`message.chatId: ${message.chatId}`)
    //       client.reply(message.from, content, message.chatId)
    //       console.log("Sent!")
    //     }

    //     if (message.body.includes("payme")) {
    //       //reset quota
    //       client.reply(message.from, "Thanks for paying us!", message.chatId)
    //       console.log("Sent!")
    //     }

    //     // if (message.caption === "/sticker" && message.mimetype) {
    //     if (message.mimetype === "image/jpeg") {
    //       console.log("Loading...")
    //       const filename: string = `${message.t}.${mime.extension(
    //         message.mimetype
    //       )}`

    //       try {
    //         console.log("Decrypting...")
    //         const mediaData = await decryptMedia(message)
    //         const imageBase64: string = `data:${
    //           message.mimetype
    //         };base64,${mediaData.toString("base64")}`

    //         client.sendImageAsSticker(message.from, imageBase64)
    //         console.log("sticker sent!")
    //       } catch (err) {
    //         throw new Error(err.message)
    //       }
    //     }

    //     if (message.body === "/sauce" && message.mimetype) {
    //       console.log("Loading...")
    //       const filename: string = `${message.t}.${mime.extension(
    //         message.mimetype
    //       )}`

    //       try {
    //         console.log("Searching...")
    //         const mediaData = await decryptMedia(message)
    //         const imageBase64: string = `data:${
    //           message.mimetype
    //         };base64,${mediaData.toString("base64")}`

    //         const raw = await fetch("https://trace.moe/api/search", {
    //           method: "POST",
    //           body: JSON.stringify({ image: imageBase64 }),
    //           headers: { "Content-Type": "application/json" }
    //         })

    //         const parsedResult = await raw.json()
    //         const { anime, episode } = parsedResult.docs[0]

    //         const content = `*Anime Found!*

    // *Title:* ${anime}
    // *Episode:* ${episode} `
    //         client.sendImage(message.from, imageBase64, filename, content)
    //         console.log("Sent!")
    //       } catch (err) {
    //         throw new Error(err.message)
    //       }
    //     }

    //     if (message.body.includes("/corona")) {
    //       console.log("fetching...")
    //       const keyword = message.body
    //         .replace(/\/corona/, "")
    //         .toLowerCase()
    //         .trim()
    //       const URL = "http://corona.coollabs.work"
    //       const data = await fetch(`${URL}/country/${keyword}`)
    //       const parsed = await data.json()
    //       if (parsed.message) {
    //         client.sendText(message.from, "Wrong country, try with another one.")
    //         return null
    //       }
    //       const { Country_Region, Confirmed, Deaths, Recovered, Active } = parsed
    //       const content = `*Current COVID-19 Data*

    // *Country:* ${Country_Region}
    // *Confirmed:* ${Confirmed}
    // *Deaths:* ${Deaths}
    // *Recovered:* ${Recovered}
    // *Active:* ${Active}

    // *Stay At Home :)*`

    //       client.reply(message.from, content, message.chatId)
    //       console.log("Sent!")
    //     }

    //     if (message.body.includes("/nulis")) {
    //       console.log("writing...")
    //       client.sendText(message.from, "sabar njir, masih nulis botnya")
    //       const text = message.body.replace(/\/nulis/, "")
    //       const split = text.replace(/(\S+\s*){1,10}/g, "$&\n")
    //       const fixedHeight = split.split("\n").slice(0, 25).join("\\n")
    //       console.log(split)
    //       spawn("convert", [
    //         "./assets/paper.jpg",
    //         "-font",
    //         "Indie-Flower",
    //         "-size",
    //         "700x960",
    //         "-pointsize",
    //         "18",
    //         "-interline-spacing",
    //         "3",
    //         "-annotate",
    //         "+170+222",
    //         fixedHeight,
    //         "./assets/result.jpg"
    //       ])
    //         .on("error", () => console.log("error"))
    //         .on("exit", () => {
    //           client.sendImage(
    //             message.from,
    //             "./assets/result.jpg",
    //             "result.jpg",
    //             ""
    //           )
    //           console.log("done")
    //         })
    //     }

    //     if (message.body.includes("/brainly")) {
    //       console.log("fetching...")
    //       const keyword = message.body.replace(/\brainly/, "")
    //       try {
    //         const data = await Brainly.getData(keyword)
    //         const result: any[] = []
    //         ;(data.result as any).map((data: any) => {
    //           result.push(`Pertanyaan: ${data.question}
    // Jawaban: ${data.answers.map(
    //             (answer: any) =>
    //               `${answer.text}${
    //                 answer.attachments.length
    //                   ? `(${answer.attachments.join(" ")})`
    //                   : ""
    //               }`
    //           )}

    // --------------
    // `)
    //         })

    //         client.sendText(message.from, result.join("\n"))
    //       } catch (err) {
    //         throw new Error(err)
    //       }
    //     }

    //     if (message.body.includes("define")) {
    //       const keyword = message.body.replace(/define/, "")
    //       const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5)
    //       try {
    //         const data = await fetch(
    //           `http://api.urbandictionary.com/v0/define?term=${keyword.trim()}`
    //         )
    //         const parsed = await data.json()
    //         const definition = shuffle(parsed.list)[0].definition.replace(
    //           /[\[\]]/g,
    //           "*"
    //         )
    //         client.sendText(message.from, `${definition}`)
    //       } catch (err) {
    //         console.log(err)
    //       }
    //     }

    //     if (message.body.includes("/anime")) {
    //       console.log("fetching...")
    //       const keyword = message.body.replace(/\/anime/, "")
    //       try {
    //         const data = await fetch(
    //           `https://api.jikan.moe/v3/search/anime?q=${keyword}`
    //         )
    //         const parsed = await data.json()
    //         if (!parsed) {
    //           client.sendText(
    //             message.from,
    //             "Anime not found, try again with another keyword."
    //           )
    //           console.log("Sent!")
    //           return null
    //         }

    //         const {
    //           title,
    //           synopsis,
    //           episodes,
    //           url,
    //           rated,
    //           score,
    //           image_url
    //         } = parsed.results[0]
    //         const content = `*Anime Found!*

    // *Title:* ${title}
    // *Episodes:* ${episodes}
    // *Rating:* ${rated}
    // *Score:* ${score}

    // *Synopsis:* ${synopsis}

    // *URL*: ${url}`

    //         const image = await bent("buffer")(image_url)
    //         const base64 = `data:image/jpg;base64,${image.toString("base64")}`

    //         client.sendImage(message.from, base64, title, content)
    //         console.log("Sent!")
    //       } catch (err) {
    //         console.error(err.message)
    //       }
    //     }

    //     if (message.body === "まだ見ぬ世界") {
    //       for (let i = 0; i < 10000; i++) {
    //         await client.sendText(message.from, `${i}`)
    //       }
    //     }

    //     if (message.body === "/test") {
    //       client.sendTextWithMentions(message.from, "something")
    //     }

    if (message.body === "/help") {
      const help = `Bot Command List:
- help
- anime
- sticker
- covid
- nulis
- sauce

Usage:
- /help
- /anime oregairu
- /nulis some random words go here
- /covid indonesia
- Send an image with /sticker caption to convert it to sticker
- Send an anime image with /sauce caption to find the anime title
`
      client.sendText(message.from, help)
    }
  })
}

create()
  .then((client: Client) => start(client))
  .catch(err => console.log(err))
