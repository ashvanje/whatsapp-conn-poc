import { create, Client, decryptMedia, Message } from "@open-wa/wa-automate"
import mime from "mime-types"
import fetch from "node-fetch"
import bent from "bent"
import { spawn } from "child_process"
import Brainly from "brainly-scraper-ts"
const express = require('express')
const googleAuth = require('google-oauth-jwt')
const axios = require('axios')

function enquiryToCompany(enquiry: any) {
    if (enquiry == 1) {
        return "MTR"
    } else if (enquiry == 2) {
        return "CTB"
    } else {
        return "NWFB"
    }
}

async function getRoutes(params: any) {
    let company = enquiryToCompany(params.enquiry)
    // let stationCode = params.stop
    // let line = params.route
    // if (company == "MTR") {
    console.log(`getRoutes!!!!!!!!!!!!!!`)
    let mtrRoutes = await axios.get(`http://whenarrive.com/getRoutes?company=MTR`, {
        // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
        content: JSON,
        content_type: 'application/json',
        expect_type: 'text/plain',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    console.log(`mtrRoutes.data: ${JSON.stringify(mtrRoutes.data)}`)
    let resultString = ``
    let i = 1
    console.log(`mtrRoutes.data: ${JSON.stringify(mtrRoutes.data)}`)
    for (var route of mtrRoutes.data) {
        console.log(`route: ${JSON.stringify(route)}`)
        resultString = resultString +
`${i++} ${route.route}
`
    }
    return resultString
    // } else {
    //     return "Please input the bus number"
    // }
}

async function inoutboundstops(params: any) {
    let company = enquiryToCompany(params.enquiry)
    let stationCode = params.stop
    let line = params.route
    console.log(`params in apiHandler: ${JSON.stringify(params)}`)
    let data = { "company": "MTR", "route": "TCL" }
    let inoutboundstops = await axios.post(`http://whenarrive.com/inoutboundstops`, data, {
        // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
        content: JSON,
        content_type: 'application/json',
        expect_type: 'text/plain',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    let resultString = ``
    let i = 1
    for (var element of inoutboundstops.data) {
        console.log(`element: ${JSON.stringify(element)}`)
        resultString = resultString +
`${i++} ${element.stop}
`
    }
    return resultString
}


async function mtrStops(params: any) {
    let company = enquiryToCompany(params.enquiry)
    let stationCode = params.stop
    let line = params.route
    console.log(`params in apiHandler: ${JSON.stringify(params)}`)
    let stops =  await axios.get(`http://whenarrive.com/mtrStops?route=TCL&bound=up`, {
        "headers": {
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
            'Content-Type': 'application/json',
            'Referer': 'http://whenarrive.com/',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    })
    let resultString = ``
    let i = 1
    for (var element of stops.data) {
        console.log(`element: ${JSON.stringify(element)}`)
        resultString = resultString +
`${i++} ${element.stopName}
`
    }
    return resultString
}

async function getEta(params: any) {
    let company = enquiryToCompany(params.enquiry)
    let stationCode = params.stop
    let line = params.route
    console.log(`params in apiHandler: ${JSON.stringify(params)}`)
    let data = { "company": "MTR", "boundFor": "up", "stationCode": "LAK", "line": "TCL", "station": "Lai King" }
    let eta = await axios.post(`http://whenarrive.com/getEta`, data, {
        content: JSON,
        content_type: 'application/json',
        expect_type: 'text/plain',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    let resultString = ``
    let i = 1
    for (var element of eta.data) {
        console.log(`element: ${JSON.stringify(element)}`)
        resultString = resultString +
`Destination: ${element.destination}
Time: ${element.minutesLeft} minutes

`
    }
    return resultString
}

module.exports = {
    getRoutes,
    inoutboundstops,
    mtrStops,
    getEta
}