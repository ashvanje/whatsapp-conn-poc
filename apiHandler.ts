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
        return "Citybus"
    } else {
        return "NWFB"
    }
}

function companyToEnquiry(enquiry: any) {
    if (enquiry == "MTR") {
        return "1"
    } else if (enquiry == "Citybus") {
        return "2"
    } else {
        return "3"
    }
}

function mtrLineMapper(route: any) {
    switch (route) {
        case "1":
            return "TCL"
        case "2":
            return "AEL"
        case "3":
            return "TKL"
        case "4":
            return "WRL"
        default:
            return ""
    }
}
async function getRoutes(params: any) {
    console.log(`getRoutes!!!!!!!!!!!!!!`)
    console.log(`getRoutes!!!!!!!!!!!!!! ${JSON.stringify(params)}`)
    let company = enquiryToCompany(params.enquiry)
    console.log(`company!!!!!!!!!!!!!! ${company}`)
    // let stationCode = params.stop
    // let line = params.route
    if (company == "MTR") {
        let mtrRoutes = await axios.get(`http://whenarrive.com/getRoutes?company=${company}`, {
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
    } else {
        return "Please input the bus number"
    }
}

async function inoutboundstops(params: any) {
    let company = enquiryToCompany(params.enquiry)
    let stationCode = params.stop
    console.log(`(params.route): ${(params.route)}`)
    console.log(`mtrLineMapper(params.route): ${mtrLineMapper(params.route)}`)
    let line = company=="MTR"?mtrLineMapper(params.route):params.route
    console.log(`params in apiHandler: ${JSON.stringify(params)}`)
    let data = { "company": company, "route": line }
    console.log(`data: ${JSON.stringify(data)}`)
    let inoutboundstops = await axios.post(`http://whenarrive.com/inoutboundstops`, data, {
        // let response = await axios.post(`https://dialogflow.googleapis.com/v2/projects/nextmtr-cqpc/agent/sessions/84422efe-b394-414f-862f-871fb4607a7d:detectIntent`, data, {
        content: JSON,
        content_type: 'application/json',
        expect_type: 'text/plain',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    console.log(`inoutboundstops: ${JSON.stringify(inoutboundstops.data)}`)
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
    let line = company=="MTR"?mtrLineMapper(params.route):params.route
    let direction = params.direction
    let url = ''
    console.log(`params in apiHandler: ${JSON.stringify(params)}`)
    if (company == 'MTR') {
        url='/mtrStops'
        if (direction == 1) {
            direction = 'up'
        } else {
            direction = 'down'
        }
    } else {
        url='/citybusStops'
        if (direction == 1) {

            direction = 'inbound'
        } else {
            direction = 'outbound'

        }
    }
    console.log(`url: http://whenarrive.com${url}?route=${line}&bound=${direction}&company=${company}`)
    let stops =  await axios.get(`http://whenarrive.com${url}?route=${line}&bound=${direction}&company=${company}`, {
        "headers": {
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
            'Content-Type': 'application/json',
            'Referer': 'http://whenarrive.com/',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    })
    console.log(`stops: ${JSON.stringify(stops.data)}`)
    let resultString = ``
    let i = 1
    for (var element of stops.data) {
        console.log(`element: ${JSON.stringify(element)}`)
        if (company == 'MTR') {
            resultString = resultString +
`${i++} ${element.stopName} (${element.stationCode})
`
        } else {
            resultString = resultString +
`${i++} ${element.stopName}
`
        }
    }
    return resultString
}

async function getEta(params: any) {
    let company = enquiryToCompany(params.enquiry)
    let stationCode = params.stop
    let line = company=="MTR"?mtrLineMapper(params.route):params.route
    let direction = params.direction
    let url = ''
    let data
    console.log(`params in apiHandler: ${JSON.stringify(params)}`)
    if (company == 'MTR') {
        url='/mtrStops'
        if (direction == 1) {
            direction = 'up'
        } else {
            direction = 'down'
        }
        data = { "company": company, "boundFor": direction, "stationCode": stationCode, "line": line }
    } else {
        url='/citybusStops'
        if (direction == 1) {

            direction = 'inbound'
        } else {
            direction = 'outbound'

        }
        data = { "company": company, "boundFor": direction, "route": line, "startStop": parseInt(stationCode)-1, "endStop":parseInt(stationCode)}
    }
    
    let eta = await axios.post(`http://whenarrive.com/getEta`, data, {
        content: JSON,
        content_type: 'application/json',
        expect_type: 'text/plain',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    console.log(`eta.data: ${JSON.stringify(eta.data)}`)
    let resultString = ``
    let stop = ''
    let i = 1
    for (var element of eta.data) {
        stop = element.stopName
        console.log(`element: ${JSON.stringify(element)}`)
        resultString = resultString +
`Destination: ${element.destination}
Time: ${element.minutesLeft} minutes

`
    }
    return `Stop: ${stop}
    
${resultString}`
}

module.exports = {
    getRoutes,
    inoutboundstops,
    mtrStops,
    getEta
}