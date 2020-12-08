import { create, Client, decryptMedia, Message } from "@open-wa/wa-automate"
import mime from "mime-types"
import fetch from "node-fetch"
import bent from "bent"
import { spawn } from "child_process"
import Brainly from "brainly-scraper-ts"
const express = require('express')
const googleAuth = require('google-oauth-jwt')
const axios = require('axios')


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
  
  async function detectIntent(userText: any, sessionId: any) {
    
    let email = 'dialogflow-bmwdcn@nextmtr-cqpc.iam.gserviceaccount.com'
    let key = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCvcAQWdM/JT1cK\n4cxDfGR1LFgpB3/eXAKuA2t6Zvmd2pc+Ieq5vu5ZmkWrn626U9zpYy0Zv0FeeJrR\nB/h5hX/l4EslvzwGt+6If7Vl6LuPt9HWgJWAynYC1Tfjs9Oj4XBDz4JK0IPH8Aho\nSydZdCOHcwIE9eXm5Zuy7sr2rZPRuL72dP1Nj5Z2Ei4LX3mzJtKpV2cxubm2VUqD\n4COF+TQjgtLaXWrCHESntzu83SKQjqZ7xdpR4TmBmwcNsJ7YjrBoGT4MOAan1Za7\n6dW11WbdYVqe8uFJs0GSMCwnipAuqoyoeLRE5zK//XHxiSVS8au7o5rXlFQ69ev6\nZXNQiA13AgMBAAECggEARrza2RcmhRw5k4ix7PAmLVzA+2Iru8PLzNBSMNt+gJiX\n7RSN6XFD99sNhoLu8LdJ1s0HbV9Bg08L1YbqOE2M4WqLwl+WW3skceNUiA/MOMm8\nkUntfi2kYcYJMAXdKzIGK0FrXrEuwZpWOX88EYSTotTLlqZzmaMxIXfJXKdmd+Pi\nOeL9R/I5S4k9k3EtslIfTTs2rajwdmd/ANDHWBFG+1uqh+7NLMRNAiAl+x/AGdVU\naqg0g1UPG2bVYQis4hQrMlkvC+uJfZXVseZIoHEnyAB87fnB/j3h80dOvJLKOtzX\nVHjRphzuRjeed5p+tcWygl8Batj1gY7hoZp1XC1VWQKBgQD2cX6fpTydSKpzNiJX\nSXR1JsC75D+IPJX0cA74Ss4zksos62BU375RHVztdp5ZhCok90hoqDMKPibOPnBr\nbMY8kNV2NOJ+we4KuAcNrcUvM6YhOhKwYXimddiUyffBoqan3hrInJUpq5NCWPf+\nCjVXhWaUB9kWPpEr7vu+85ejbQKBgQC2PaEIvCP0xZDzRvJkSPkecGs/09TUwpIq\n9Dou2xkH5wr+2h4tjkM8DKlqTuijqFU3VpVNqt3QtMXQjQFO+bpkkWINGSM8zojM\nLhYLSW3UFKSr8p70J6zuAfM5vmrRSEIRcEJeBchePmSeVcKlNpOoJ+ytlplNZ2Q5\nppnQgnaB8wKBgQCgt9uQWb5yBJXElSVIL4tXa3J+FpioTHqu8vWQT5iyYaSgLtCg\nCVqgo7ma06TpVBv4B5ydRDQlFetQzb+bD1Eo5nuPn2WmrOqE6wcOkKjr448QVEMj\n7C02wdwBDMYa7ewpxdtJwXQ1vMNInaT9c8Ld1Q3UtFmK/DrIoA5ltY7K8QKBgDBJ\nkiKzXz+bHbYoRU+nOkMDfJdz9H/PclVpUwVZTn+Wi4ZNmxNtD4mYvUcK03+Rucqo\n6XSj4pRLYeLJieA4MVg2YWmhEIIrI3oed/7TnQNF2QAqkE2XOa3y3FSfjMQZRlBC\nk4NAOwAlvhlqFeIa3PMAaSjxr3sf+yF/cGAcQXRbAoGBAL2zeeuIARjmlKprGES/\nSVcXMXlN5lOgamSUzBtnRB45NAhvCY7RYKADcq66Ginnw2PeaygaAFRGhIz0fxNI\nIUi8zZtwh/BggNcqQ86XLrBldD42kUhds9jrYBWiM/Rv2XCmUHBiadH/P5qXFSms\nvgAs1GI+5EytOxPL/BlYLJOF\n-----END PRIVATE KEY-----\n'
    let url = 'https://dialogflow.googleapis.com/v2/'
    let path = 'projects/nextmtr-cqpc/agent/sessions/'
    let sid = 'abcdefg'
    
    let accessToken = await generateAccessToken(email, key)
  
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

    let fulfillmentMessagesText = response.data.queryResult.fulfillmentMessages[0].text.text[0]
    let intent = response.data.queryResult.intent.displayName
    let outputContexts = response.data.queryResult.outputContexts
    console.log(`outputContexts.length = ${outputContexts.length}`)
    let outputContextLength = (outputContexts.length - 2)<0?0:(outputContexts.length - 2)
    console.log(`outputContextLength = ${outputContextLength}`)
    console.log(`outputContexts[outputContextLength].parameters = ${JSON.stringify(outputContexts[outputContextLength].parameters)}`)

    //availableenquiries-followup
    let outputContext
    for (var element of outputContexts) {
      if (element.name.endsWith('availableenquiries-followup')) {
        outputContext = element
      }
    }
    console.log(`outputcontext: ${JSON.stringify(outputContext)}`)
    let parameters
    if (outputContext) {
      console.log(`outputcontext is not null`)
      parameters = outputContext.parameters
    } else {
      console.log(`outputcontext is null`)

    }
    return {
        dialogFlowFulfillmentMessage: fulfillmentMessagesText,
        intent: intent,
        outputContexts: outputContexts,
        parameters: parameters,
        rawResponse: response.data
    }
  }
  
  module.exports = {
    detectIntent
  }