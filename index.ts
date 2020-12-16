import { create, Client, decryptMedia, Message } from "@open-wa/wa-automate"
import mime from "mime-types"
import fetch from "node-fetch"
import bent from "bent"
import { spawn } from "child_process"
import Brainly from "brainly-scraper-ts"
const express = require('express')
const googleAuth = require('google-oauth-jwt')
const axios = require('axios')
const dialogflow = require('./dialogflow')
const apiHandler = require('./apiHandler')
const intentHandler = require('./intentHandler')


var mongoose = require("mongoose");
var mongoConnection: any;
var viewSchema = new mongoose.Schema({}, { strict: false });
var viewModel = mongoose.model("View", viewSchema);

function start(client: Client) {
  //TODO: implement a secret function that transforms image to sticker

  client.onMessage(async (message: Message) => {
    await saveViewToDB(message)
    // if (message.mimetype === "image/jpeg") {
    //   console.log("Loading...")
    //   const filename: string = `${message.t}.${mime.extension(
    //     message.mimetype
    //   )}`

    //   try {
    //     console.log("Decrypting...")
    //     const mediaData = await decryptMedia(message)
    //     const imageBase64: string = `data:${message.mimetype
    //       };base64,${mediaData.toString("base64")}`

    //     client.sendImageAsSticker(message.from, imageBase64)
    //     console.log("sticker sent!")
    //   } catch (err) {
    //     throw new Error(err.message)
    //   }
    // } else {
      const isEligible = checkRemainingQuotaForNumber(message.from)
      if (isEligible) {

      }
      console.log(`before sendMessageResponse`)
      const sendMessageResponse = await sendMessage(message.body, message.from+"5")
      console.log(`sendMessageResponse: ${sendMessageResponse}`)
      let content = ''
      content = sendMessageResponse
      client.sendText(message.from, `${content}`)
      console.log("Sent!")
    // }

  })
}


async function sendMessage(userText: any, sessionId: any) {
  try {
  let returnMessage = await intentHandler.handleIntent(userText, sessionId)
  return returnMessage
  } catch (error) {
    console.log(JSON.stringify(error))
  }
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

create()
  .then((client: Client) => start(client))
  .catch(err => console.log(err))
